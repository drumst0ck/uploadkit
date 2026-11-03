import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('@/lib/user-quota', () => ({
  withUserQuotaLock: async (_userId: unknown, work: () => Promise<unknown>) => work(),
  reservedUploadUsage: async () => ({ storageUsed: 0, uploads: 0 }),
}));
import { AbortMultipartUploadCommand } from '@aws-sdk/client-s3';

const ctx = vi.hoisted(() => ({ project: { _id: '507f1f77bcf86cd799439011', userId: '507f1f77bcf86cd799439012' }, tier: 'PRO' }));
vi.mock('@/lib/with-api-key', () => ({
  withApiKey: (handler: any) => async (req: NextRequest, segment: any) => handler(req, ctx, await segment.params),
}));
vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn(),
  Project: { find: vi.fn(), findOne: vi.fn(), findOneAndUpdate: vi.fn(), deleteOne: vi.fn() },
  ApiKey: { updateMany: vi.fn() },
  FileRouter: { findOne: vi.fn(), deleteMany: vi.fn() },
  File: { find: vi.fn(), create: vi.fn(), findOneAndUpdate: vi.fn(), updateMany: vi.fn() },
  UsageRecord: { findOne: vi.fn(), findOneAndUpdate: vi.fn() },
  UploadRejection: { countDocuments: vi.fn(async () => 0), create: vi.fn() },
}));
vi.mock('@/lib/storage', () => ({ r2Client: { send: vi.fn() }, R2_BUCKET: 'test', CDN_URL: 'https://cdn.uploadkit.dev' }));
vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: vi.fn().mockResolvedValue('https://storage.test/upload') }));
vi.mock('@uploadkitdev/cloudflare', () => ({
  isCloudflareCdnConfigured: () => true,
  getCloudflareConfig: () => ({}),
  getCustomHostname: vi.fn(),
}));

import { Project, File, FileRouter, UsageRecord, ApiKey } from '@uploadkitdev/db';
import { r2Client } from '@/lib/storage';
import { getCustomHostname } from '@uploadkitdev/cloudflare';
import { GET as logs } from '@/app/api/v1/logs/route';
import { GET as projects } from '@/app/api/v1/projects/route';
import { PATCH as patchProject, DELETE as deleteProject } from '@/app/api/v1/projects/[id]/route';
import { POST as init } from '@/app/api/v1/upload/multipart/init/route';
import { GET as verifyCdn } from '@/app/api/cron/cdn-verify/route';
import { GET as lifecycle } from '@/app/api/cron/lifecycle/route';

const segment = { params: Promise.resolve({ id: ctx.project._id }) };
const byosConfig = { provider: 's3', region: 'auto', bucket: 'bucket', accessKeyId: 'credential-id', secretAccessKeyEncrypted: 'ciphertext' };
function request(path: string, body?: unknown) {
  return new NextRequest(`http://localhost${path}`, body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) });
}
function cronRequest(path: string) {
  return new NextRequest(`http://localhost${path}`, { headers: { authorization: 'Bearer test-cron-secret' } });
}
const initBody = { fileName: 'large.png', contentType: 'image/png', fileSize: 20 * 1024 * 1024, routeSlug: 'images' };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(UsageRecord.findOne).mockResolvedValue(null);
  vi.mocked(r2Client.send).mockResolvedValue({ UploadId: 'multipart-id' } as any);
  vi.mocked(FileRouter.findOne).mockResolvedValue({ allowedTypes: ['image/*'], maxFileSize: 100 * 1024 * 1024 } as any);
  vi.mocked(File.create).mockResolvedValue({ _id: 'file-id', key: 'key' } as any);
});

describe('T6 route regressions', () => {
  it('uses default logs limit when omitted and rejects omitted since', async () => {
    const limit = vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    vi.mocked(File.find).mockReturnValue({ sort: () => ({ limit }) } as any);
    const res = await logs(request('/api/v1/logs?since=2026-01-01'), segment);
    expect(res.status).toBe(200);
    expect(limit).toHaveBeenCalledWith(50);
    expect((await logs(request('/api/v1/logs'), segment)).status).toBe(400);
  });

  it('never returns BYOS credentials in project list or update responses', async () => {
    const project = { ...ctx.project, byosConfig };
    vi.mocked(Project.find).mockReturnValue({ lean: async () => [project] } as any);
    vi.mocked(Project.findOneAndUpdate).mockReturnValue({ lean: async () => project } as any);
    for (const res of [await projects(request('/api/v1/projects'), segment), await patchProject(request('/api/v1/projects/id', { name: 'new name' }), segment)]) {
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).not.toContain('ciphertext');
      expect(body).not.toContain('credential-id');
      expect(body).toContain('bucket');
    }
  });

  it('accepts image/* in multipart just as in simple uploads', async () => {
    const res = await init(request('/api/v1/upload/multipart/init', initBody), segment);
    expect(res.status).toBe(200);
  });

  it('aborts the R2 multipart when creating its File record fails', async () => {
    vi.mocked(FileRouter.findOne).mockResolvedValue({ allowedTypes: [], maxFileSize: 100 * 1024 * 1024 } as any);
    vi.mocked(File.create).mockRejectedValue(new Error('database unavailable'));
    const res = await init(request('/api/v1/upload/multipart/init', initBody), segment);
    expect(res.status).toBe(500);
    expect(vi.mocked(r2Client.send).mock.calls.some(([command]) => command instanceof AbortMultipartUploadCommand)).toBe(true);
  });

  it('retains pending CDN status after transient Cloudflare failure', async () => {
    const project = { customCdnHostnameId: 'hostname', customCdnStatus: 'pending_validation', save: vi.fn() };
    vi.mocked(Project.find).mockResolvedValue([project] as any);
    vi.mocked(getCustomHostname).mockRejectedValue(new Error('temporary outage'));
    expect((await verifyCdn(cronRequest('/api/cron/cdn-verify'))).status).toBe(200);
    expect(project.customCdnStatus).toBe('pending_validation');
    expect(project).toHaveProperty('customCdnLastError', 'temporary outage');
    expect(project.save).toHaveBeenCalledOnce();
  });

  it('leaves lifecycle failures retryable and accounts only a claimed successful deletion', async () => {
    vi.mocked(Project.find).mockReturnValue({ lean: async () => [{ ...ctx.project, lifecyclePolicy: { enabled: true, retentionDays: 1 } }] } as any);
    const stale = [{ _id: 'success', key: 'success', size: 7, status: 'UPLOADED' }, { _id: 'failure', key: 'failure', size: 11, status: 'UPLOADED' }];
    vi.mocked(File.find).mockReturnValue({ select: () => ({ lean: async () => stale }) } as any);
    vi.mocked(r2Client.send).mockImplementation(async (command: any) => {
      if (command.input.Key === 'failure') throw new Error('R2 unavailable');
      return {} as any;
    });
    vi.mocked(File.findOneAndUpdate).mockResolvedValue(stale[0] as any);
    const res = await lifecycle(cronRequest('/api/cron/lifecycle'));
    expect(await res.json()).toMatchObject({ deleted: 1 });
    expect(File.updateMany).not.toHaveBeenCalled();
    expect(File.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({ _id: 'success', status: 'UPLOADED' }), expect.anything(), expect.anything());
    expect(UsageRecord.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({ userId: ctx.project.userId }), { $inc: { storageUsed: -7 } });
  });

  it('does not reclaim usage twice when a concurrent lifecycle run already claimed the file', async () => {
    vi.mocked(Project.find).mockReturnValue({ lean: async () => [{ ...ctx.project, lifecyclePolicy: { enabled: true, retentionDays: 1 } }] } as any);
    vi.mocked(File.find).mockReturnValue({ select: () => ({ lean: async () => [{ _id: 'done', key: 'key' }] }) } as any);
    vi.mocked(File.findOneAndUpdate).mockResolvedValue(null);
    expect(await (await lifecycle(cronRequest('/api/cron/lifecycle'))).json()).toMatchObject({ deleted: 0 });
    expect(UsageRecord.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('keeps project and credentials retryable when project storage deletion fails', async () => {
    vi.mocked(Project.findOne).mockResolvedValue(ctx.project as any);
    vi.mocked(File.find).mockReturnValue({ lean: async () => [{ _id: 'file', key: 'key' }] } as any);
    vi.mocked(r2Client.send).mockRejectedValue(new Error('R2 unavailable'));
    expect((await deleteProject(request('/api/v1/projects/id'), segment)).status).toBe(500);
    expect(Project.deleteOne).not.toHaveBeenCalled();
    expect(ApiKey.updateMany).not.toHaveBeenCalled();
    expect(File.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects a MIME family mismatch and accepts the all-types wildcard', async () => {
    expect((await init(request('/api/v1/upload/multipart/init', { ...initBody, contentType: 'application/pdf' }), segment)).status).toBe(400);
    vi.mocked(FileRouter.findOne).mockResolvedValue({ allowedTypes: ['*/*'], maxFileSize: 100 * 1024 * 1024 } as any);
    expect((await init(request('/api/v1/upload/multipart/init', initBody), segment)).status).toBe(200);
  });

  it('cascades project deletion through storage and routers before deleting the project', async () => {
    vi.mocked(Project.findOne).mockResolvedValue(ctx.project as any);
    const files = [{ _id: 'file', key: 'key', size: 7, status: 'UPLOADED' }];
    vi.mocked(File.find).mockReturnValue({ lean: async () => files } as any);
    vi.mocked(File.findOneAndUpdate).mockResolvedValue(files[0] as any);
    const res = await deleteProject(request('/api/v1/projects/id'), segment);
    expect(res.status).toBe(200);
    expect(r2Client.send).toHaveBeenCalled();
    expect(FileRouter.deleteMany).toHaveBeenCalledWith({ projectId: ctx.project._id });
    expect(UsageRecord.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({ userId: ctx.project.userId }), { $inc: { storageUsed: -7 } });
    expect(Project.deleteOne).toHaveBeenCalledOnce();
    expect(ApiKey.updateMany).toHaveBeenCalledOnce();
  });
});
