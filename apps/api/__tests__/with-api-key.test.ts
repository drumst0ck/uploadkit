import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock external dependencies before importing withApiKey
vi.mock('@uploadkit/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  ApiKey: {
    findOne: vi.fn(),
    updateOne: vi.fn().mockResolvedValue({}),
  },
  Subscription: {
    findOne: vi.fn(),
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  ratelimit: {
    limit: vi.fn(),
  },
  uploadRatelimit: {
    limit: vi.fn(),
  },
}));

import { withApiKey } from '@/lib/with-api-key';
import { ApiKey, Subscription } from '@uploadkit/db';
import { ratelimit } from '@/lib/rate-limit';

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  const req = new NextRequest('http://localhost/api/v1/test', {
    headers,
  });
  return req;
}

function makeSegmentData(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) };
}

const fakeProject = {
  _id: 'proj-123',
  userId: 'user-456',
  name: 'Test Project',
  slug: 'test-project',
};

const fakeApiKey = {
  _id: 'key-789',
  projectId: fakeProject,
  keyHash: 'fakehash',
  revokedAt: null,
};

describe('withApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ratelimit.limit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60000,
      pending: Promise.resolve(),
      reason: 'cacheBlock',
      logs: [],
    });
    vi.mocked(ApiKey.findOne).mockReturnValue({
      populate: vi.fn().mockResolvedValue(fakeApiKey),
    } as any);
    vi.mocked(Subscription.findOne).mockResolvedValue({ tier: 'FREE' });
  });

  it('returns 401 when Authorization header is missing', async () => {
    const handler = vi.fn();
    const wrapped = withApiKey(handler);
    const req = makeRequest({});
    const res = await wrapped(req, makeSegmentData());
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 401 when Bearer token format is invalid', async () => {
    const handler = vi.fn();
    const wrapped = withApiKey(handler);
    const req = makeRequest({ authorization: 'Basic sometoken' });
    const res = await wrapped(req, makeSegmentData());
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(ratelimit.limit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 30000,
      pending: Promise.resolve(),
      reason: 'cacheBlock',
      logs: [],
    });

    const handler = vi.fn();
    const wrapped = withApiKey(handler);
    const req = makeRequest({ authorization: 'Bearer uk_live_testtoken123' });
    const res = await wrapped(req, makeSegmentData());
    const body = await res.json();
    expect(res.status).toBe(429);
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 401 when API key hash is not found in DB', async () => {
    vi.mocked(ApiKey.findOne).mockReturnValue({
      populate: vi.fn().mockResolvedValue(null),
    } as any);

    const handler = vi.fn();
    const wrapped = withApiKey(handler);
    const req = makeRequest({ authorization: 'Bearer uk_live_testtoken123' });
    const res = await wrapped(req, makeSegmentData());
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 401 when API key is revoked (revokedAt set)', async () => {
    // The withApiKey implementation queries { revokedAt: null } so a revoked key
    // won't be found — simulate this by returning null
    vi.mocked(ApiKey.findOne).mockReturnValue({
      populate: vi.fn().mockResolvedValue(null),
    } as any);

    const handler = vi.fn();
    const wrapped = withApiKey(handler);
    const req = makeRequest({ authorization: 'Bearer uk_live_revokedtoken' });
    const res = await wrapped(req, makeSegmentData());
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(handler).not.toHaveBeenCalled();
  });

  it('calls handler with ApiContext when key is valid', async () => {
    const handler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const wrapped = withApiKey(handler);
    const req = makeRequest({ authorization: 'Bearer uk_live_validtoken123' });
    await wrapped(req, makeSegmentData());

    expect(handler).toHaveBeenCalledOnce();
    const [, ctx] = handler.mock.calls[0]!;
    expect(ctx.tier).toBe('FREE');
    expect(ctx.project).toMatchObject({ _id: 'proj-123', userId: 'user-456' });
  });
});
