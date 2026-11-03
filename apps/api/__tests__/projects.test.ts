import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Parallel project-count admission is covered by audit-quota.test.ts.
vi.mock('@/lib/user-quota', () => ({
  withUserQuotaLock: async (_userId: unknown, work: () => Promise<unknown>) => work(),
}));

vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  ApiKey: {
    findOne: vi.fn(),
    updateOne: vi.fn().mockResolvedValue({}),
  },
  Subscription: {
    findOne: vi.fn(),
  },
  Project: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
  FileRouter: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  ratelimit: { limit: vi.fn() },
  uploadRatelimit: { limit: vi.fn() },
}));

vi.mock('@/lib/storage', () => ({
  r2Client: { send: vi.fn() },
  R2_BUCKET: 'test-bucket',
  CDN_URL: 'https://cdn.uploadkit.dev',
}));

import { GET, POST } from '@/app/api/v1/projects/route';
import { ApiKey, Subscription, Project, FileRouter } from '@uploadkitdev/db';
import { ratelimit } from '@/lib/rate-limit';

const fakeProject = { _id: 'proj-crud', userId: 'user-crud', name: 'CRUD Project', slug: 'crud-project-abc123' };
const fakeApiKeyDoc = { _id: 'key-crud', projectId: fakeProject, keyHash: 'hash', revokedAt: null };

function setupAuth() {
  vi.mocked(ratelimit.limit).mockResolvedValue({
    success: true, limit: 10, remaining: 9, reset: Date.now() + 60000,
    pending: Promise.resolve(), reason: 'cacheBlock',
  } as any);
  vi.mocked(ApiKey.findOne).mockReturnValue({
    populate: vi.fn().mockResolvedValue(fakeApiKeyDoc),
  } as any);
  vi.mocked(ApiKey.updateOne).mockResolvedValue({} as any);
  vi.mocked(Subscription.findOne).mockResolvedValue({ tier: 'FREE' } as any);
}

describe('GET /api/v1/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it("lists only the key's own project, never the other projects of the account", async () => {
    vi.mocked(Project.find).mockReturnValue({ lean: vi.fn().mockResolvedValue([fakeProject]) } as any);
    vi.mocked(Project.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue(fakeProject) } as any);

    const req = new NextRequest('http://localhost/api/v1/projects', {
      headers: { authorization: 'Bearer uk_live_testtoken' },
    });
    const res = await GET(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.projects).toHaveLength(1);
    expect(body.projects[0]._id).toBe('proj-crud');
    expect(Project.find).not.toHaveBeenCalled();
    const scoped = [...vi.mocked(Project.find).mock.calls, ...vi.mocked(Project.findOne).mock.calls].map((call) => call[0] as unknown as Record<string, unknown>);
    expect(scoped.every((filter) => filter['_id'] === 'proj-crud')).toBe(true);
  });
});

describe('POST /api/v1/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it('rejects project creation with a project key and creates nothing', async () => {
    vi.mocked(Project.countDocuments).mockResolvedValue(0);
    const req = new NextRequest('http://localhost/api/v1/projects', {
      method: 'POST',
      headers: { authorization: 'Bearer uk_live_testtoken', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'My New Project' }),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(Project.create).not.toHaveBeenCalled();
    expect(FileRouter.create).not.toHaveBeenCalled();
  });
});
