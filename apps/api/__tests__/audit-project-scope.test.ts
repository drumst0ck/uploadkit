import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const ownId = '507f1f77bcf86cd799439011';
const otherId = '507f1f77bcf86cd799439022';
vi.mock('@/lib/with-api-key', () => ({ withApiKey: (handler: any) => async (req: NextRequest, segment: any) => handler(req, { project: { _id: '507f1f77bcf86cd799439011', userId: 'same-user' }, tier: 'PRO' }, await segment.params) }));
vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn(),
  File: { find: vi.fn() },
  Project: { findOne: vi.fn(), findOneAndUpdate: vi.fn(), deleteOne: vi.fn() },
  ApiKey: { findOne: vi.fn(), find: vi.fn(), countDocuments: vi.fn(), create: vi.fn(), updateMany: vi.fn(), findByIdAndUpdate: vi.fn() },
  FileRouter: { find: vi.fn(), create: vi.fn(), findById: vi.fn(), findByIdAndUpdate: vi.fn(), deleteOne: vi.fn() },
}));
vi.mock('@/lib/storage', () => ({ r2Client: { send: vi.fn() }, R2_BUCKET: 'test' }));
import { Project, ApiKey, FileRouter, File } from '@uploadkitdev/db';
import { PATCH as patchProject, DELETE as deleteProject } from '@/app/api/v1/projects/[id]/route';
import { GET as getKeys, POST as createKey } from '@/app/api/v1/projects/[id]/keys/route';
import { GET as getRouters, POST as createRouter } from '@/app/api/v1/projects/[id]/routers/route';
import { DELETE as revokeKey } from '@/app/api/v1/keys/[keyId]/route';
import { PATCH as patchRouter, DELETE as deleteRouter } from '@/app/api/v1/routers/[routerId]/route';

beforeEach(() => {
  vi.resetAllMocks();
  // The target has the same owner: user-level ownership alone must not authorize it.
  vi.mocked(Project.findOne).mockResolvedValue({ _id: otherId, userId: 'same-user' } as any);
  vi.mocked(Project.findOneAndUpdate).mockReturnValue({ lean: async () => ({ _id: otherId }) } as any);
  vi.mocked(ApiKey.findOne).mockResolvedValue({ _id: otherId, projectId: otherId } as any);
  vi.mocked(FileRouter.findById).mockResolvedValue({ _id: otherId, projectId: otherId } as any);
  vi.mocked(File.find).mockReturnValue({ lean: async () => [] } as any);
  vi.mocked(ApiKey.find).mockReturnValue({ select: () => ({ lean: async () => [] }) } as any);
  vi.mocked(ApiKey.create).mockResolvedValue({ _id: otherId } as any);
  vi.mocked(FileRouter.find).mockReturnValue({ lean: async () => [] } as any);
  vi.mocked(FileRouter.findByIdAndUpdate).mockReturnValue({ lean: async () => ({ _id: otherId }) } as any);
  vi.mocked(FileRouter.create).mockResolvedValue({ _id: otherId } as any);
});
function req(body?: unknown) { return new NextRequest('http://localhost/api/v1/target', body ? { method: 'POST', body: JSON.stringify(body) } : {}); }
const segment = { params: Promise.resolve({ id: otherId, keyId: otherId, routerId: otherId }) };

describe('project-scoped keys', () => {
  it.each([
    ['patch project', patchProject, { name: 'edited' }],
    ['delete project', deleteProject, undefined],
    ['list keys', getKeys, undefined],
    ['create key', createKey, { name: 'new' }],
    ['list routers', getRouters, undefined],
    ['create router', createRouter, { slug: 'new' }],
    ['revoke key', revokeKey, undefined],
    ['patch router', patchRouter, { maxFileSize: 100 }],
    ['delete router', deleteRouter, undefined],
  ])('denies %s in another project of the same user', async (_name, handler, body) => {
    const response = await (handler as any)(req(body), segment);
    expect(response.status).toBe(404);
    expect(Project.findOneAndUpdate).not.toHaveBeenCalled();
    expect(Project.deleteOne).not.toHaveBeenCalled();
    expect(ApiKey.create).not.toHaveBeenCalled();
    expect(ApiKey.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(FileRouter.create).not.toHaveBeenCalled();
    expect(FileRouter.deleteOne).not.toHaveBeenCalled();
  });
  it('still allows updating its own project', async () => {
    vi.mocked(Project.findOneAndUpdate).mockReturnValue({ lean: async () => ({ _id: ownId }) } as any);
    const res = await patchProject(req({ name: 'own project' }), { params: Promise.resolve({ id: ownId }) });
    expect(res.status).toBe(200);
  });
});
