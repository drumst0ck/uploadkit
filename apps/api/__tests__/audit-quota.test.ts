import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { TIER_LIMITS } from '@uploadkitdev/shared';
const state = vi.hoisted(() => ({ pending: [] as any[], locks: new Map<string, string>(), usage: { storageUsed: 0, uploads: 999 }, projects: 1 }));
vi.mock('@/lib/with-api-key', () => ({ withApiKey: (handler: any) => async (req: NextRequest) => handler(req, { project: { _id: 'project', userId: 'user' }, tier: 'FREE' }) }));
vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn(),
  ImageTransformLock: {
    findOneAndUpdate: vi.fn((filter: any, update: any) => ({ lean: async () => {
      if (state.locks.has(filter.lockKey)) throw { code: 11000 };
      state.locks.set(filter.lockKey, update.$set.owner);
      return { owner: update.$set.owner };
    } })),
    deleteOne: vi.fn(async (filter: any) => { if (state.locks.get(filter.lockKey) === filter.owner) state.locks.delete(filter.lockKey); }),
  },
  Project: {
    find: vi.fn(() => ({ distinct: async () => ['project', 'other-project-same-user'] })),
    countDocuments: vi.fn(async () => state.projects),
    create: vi.fn(async (input: any) => { state.projects++; return { ...input, _id: 'created-project' }; }),
  },
  FileRouter: { findOne: vi.fn(async () => ({ allowedTypes: [], maxFileSize: 4194304 })), create: vi.fn() },
  File: {
    aggregate: vi.fn(async () => [{ storageUsed: state.pending.reduce((sum, file) => sum + file.size, 0), uploads: state.pending.length }]),
    create: vi.fn(async (input: any) => { const file = { ...input, _id: `file-${state.pending.length}` }; state.pending.push(file); return file; }),
  },
  UsageRecord: { findOne: vi.fn(async () => ({ ...state.usage })) },
  UploadRejection: { countDocuments: vi.fn(async () => 0), create: vi.fn() },
}));
vi.mock('@/lib/presign', () => ({ generatePresignedPutUrl: vi.fn(async () => 'https://storage.test/upload') }));
vi.mock('@/lib/storage', () => ({ CDN_URL: 'https://cdn.uploadkit.dev' }));
import { POST as upload } from '@/app/api/v1/upload/request/route';
import { POST as createProject } from '@/app/api/v1/projects/route';
import { File, Project } from '@uploadkitdev/db';
const segment = { params: Promise.resolve({}) };
function request(path: string, body: unknown) { return new NextRequest(`http://localhost${path}`, { method: 'POST', body: JSON.stringify(body) }); }
function uploadRequest(size = 2) { return request('/api/v1/upload/request', { fileName: 'test.png', fileSize: size, contentType: 'image/png', routeSlug: 'images' }); }
beforeEach(() => { vi.clearAllMocks(); state.pending = []; state.locks.clear(); state.usage = { storageUsed: 0, uploads: 999 }; state.projects = 1; });

describe('atomic API quota reservations', () => {
  it('admits only one parallel presign when one monthly upload remains', async () => {
    const responses = await Promise.all([upload(uploadRequest(), segment), upload(uploadRequest(), segment)]);
    expect(responses.map((res) => res.status).sort()).toEqual([200, 403]);
    expect((await responses.find((res) => res.status === 403)!.json()).error.code).toBe('TIER_LIMIT_EXCEEDED');
    expect(File.create).toHaveBeenCalledOnce();
  });
  it('counts pending bytes across projects and releases capacity when an upload is removed', async () => {
    state.usage = { storageUsed: TIER_LIMITS.FREE.maxStorageBytes - 3, uploads: 0 };
    const responses = await Promise.all([upload(uploadRequest(), segment), upload(uploadRequest(), segment)]);
    expect(responses.map((res) => res.status).sort()).toEqual([200, 403]);
    state.pending = []; // aborted/cleaned UPLOADING record no longer reserves bytes
    expect((await upload(uploadRequest(), segment)).status).toBe(200);
    expect(Project.find).toHaveBeenCalledWith({ userId: 'user' });
  });
  it('cannot exceed project count with parallel creates', async () => {
    const responses = await Promise.all([createProject(request('/api/v1/projects', { name: 'one' }), segment), createProject(request('/api/v1/projects', { name: 'two' }), segment)]);
    expect(responses.map((res) => res.status).sort()).toEqual([201, 403]);
    expect(state.projects).toBe(2);
  });
});
