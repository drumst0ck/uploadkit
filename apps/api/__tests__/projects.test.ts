import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

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
    create: vi.fn(),
    countDocuments: vi.fn(),
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
import { ApiKey, Subscription, Project } from '@uploadkitdev/db';
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

  it('returns user projects list', async () => {
    const projects = [fakeProject, { _id: 'proj-2', userId: 'user-crud', name: 'Project 2', slug: 'project-2-xyz' }];
    vi.mocked(Project.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue(projects),
    } as any);

    const req = new NextRequest('http://localhost/api/v1/projects', {
      headers: { authorization: 'Bearer uk_live_testtoken' },
    });
    const res = await GET(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.projects).toHaveLength(2);
    // Verify scoped to authenticated user
    const findCall = vi.mocked(Project.find).mock.calls[0]![0] as unknown as Record<string, unknown>;
    expect(findCall['userId']).toBe('user-crud');
  });
});

describe('POST /api/v1/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it('creates project with auto-generated slug', async () => {
    vi.mocked(Project.countDocuments).mockResolvedValue(0); // under FREE limit of 2
    vi.mocked(Project.create).mockResolvedValue({
      _id: 'new-proj-id',
      name: 'My New Project',
      slug: 'my-new-project-abc123',
      userId: 'user-crud',
    } as any);

    const req = new NextRequest('http://localhost/api/v1/projects', {
      method: 'POST',
      headers: { authorization: 'Bearer uk_live_testtoken', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'My New Project' }),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.project).toBeDefined();
    expect(body.project.name).toBe('My New Project');
    // Slug is generated dynamically — just verify it's a string
    expect(typeof body.project.slug).toBe('string');
  });

  it('returns 403 when user has reached project tier limit', async () => {
    vi.mocked(Project.countDocuments).mockResolvedValue(2); // FREE tier limit is 2

    const req = new NextRequest('http://localhost/api/v1/projects', {
      method: 'POST',
      headers: { authorization: 'Bearer uk_live_testtoken', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'One Too Many' }),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe('TIER_LIMIT_EXCEEDED');
  });
});
