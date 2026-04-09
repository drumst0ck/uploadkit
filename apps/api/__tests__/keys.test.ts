import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  ApiKey: {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    updateOne: vi.fn().mockResolvedValue({}),
  },
  Subscription: {
    findOne: vi.fn(),
  },
  Project: {
    findOne: vi.fn(),
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

import { GET, POST } from '@/app/api/v1/projects/[id]/keys/route';
import { DELETE } from '@/app/api/v1/keys/[keyId]/route';
import { ApiKey, Subscription, Project } from '@uploadkitdev/db';
import { ratelimit } from '@/lib/rate-limit';

// A valid MongoDB ObjectId for tests
const FAKE_PROJECT_ID = '507f1f77bcf86cd799439011';
const FAKE_KEY_ID = '507f1f77bcf86cd799439012';

const fakeProject = { _id: FAKE_PROJECT_ID, userId: 'user-keys', name: 'Keys Project', slug: 'keys-project' };
const fakeApiKeyDoc = { _id: 'key-auth', projectId: fakeProject, keyHash: 'hash', revokedAt: null };

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

describe('POST /api/v1/projects/:id/keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    vi.mocked(Project.findOne).mockResolvedValue(fakeProject as any);
    vi.mocked(ApiKey.countDocuments).mockResolvedValue(0); // under FREE limit of 2
  });

  it('creates key, returns plaintext once, stores only hash', async () => {
    vi.mocked(ApiKey.create).mockResolvedValue({
      _id: FAKE_KEY_ID,
      keyPrefix: 'uk_live_abc1',
      name: 'Default',
      isTest: false,
      createdAt: new Date(),
    } as any);

    const req = new NextRequest(`http://localhost/api/v1/projects/${FAKE_PROJECT_ID}/keys`, {
      method: 'POST',
      headers: { authorization: 'Bearer uk_live_testtoken', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'My API Key', isTest: false }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: FAKE_PROJECT_ID }) });
    const body = await res.json();

    expect(res.status).toBe(201);
    // Full plaintext key is returned once
    expect(body.key).toBeDefined();
    expect(typeof body.key).toBe('string');
    expect(body.key.startsWith('uk_live_')).toBe(true);
    // Key object has prefix but NOT the hash
    expect(body.apiKey).toBeDefined();
    expect(body.apiKey.keyPrefix).toBeDefined();
    // keyHash must NOT be in the response
    expect(body.apiKey.keyHash).toBeUndefined();
    // Verify create was called with a hash (not plaintext)
    const createCall = vi.mocked(ApiKey.create).mock.calls[0]![0] as Record<string, unknown>;
    expect(createCall['keyHash']).toBeDefined();
    expect(createCall['keyHash']).not.toBe(body.key); // hash != plaintext
  });
});

describe('GET /api/v1/projects/:id/keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    vi.mocked(Project.findOne).mockResolvedValue(fakeProject as any);
  });

  it('returns keys without exposing keyHash', async () => {
    const storedKeys = [
      { _id: FAKE_KEY_ID, keyPrefix: 'uk_live_abc1', name: 'Key 1', isTest: false, revokedAt: null },
    ];
    vi.mocked(ApiKey.find).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(storedKeys),
    } as any);

    const req = new NextRequest(`http://localhost/api/v1/projects/${FAKE_PROJECT_ID}/keys`, {
      headers: { authorization: 'Bearer uk_live_testtoken' },
    });
    const res = await GET(req, { params: Promise.resolve({ id: FAKE_PROJECT_ID }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.keys).toHaveLength(1);
    // select('-keyHash') is called — keyHash excluded
    const selectCall = vi.mocked(ApiKey.find).mock.results[0]!.value.select.mock.calls[0]![0];
    expect(selectCall).toBe('-keyHash');
  });
});

describe('DELETE /api/v1/keys/:keyId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it('sets revokedAt timestamp on the key', async () => {
    // For DELETE, ApiKey.findOne is called twice: once for auth, once for the key lookup
    // Set up findOne to return auth key on first call, then the target key on second call
    vi.mocked(ApiKey.findOne)
      .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue(fakeApiKeyDoc) } as any)
      .mockResolvedValueOnce({ _id: FAKE_KEY_ID, projectId: FAKE_PROJECT_ID, revokedAt: null } as any);
    vi.mocked(Project.findOne).mockResolvedValue(fakeProject as any);
    vi.mocked(ApiKey.findByIdAndUpdate).mockResolvedValue({} as any);

    const req = new NextRequest(`http://localhost/api/v1/keys/${FAKE_KEY_ID}`, {
      method: 'DELETE',
      headers: { authorization: 'Bearer uk_live_testtoken' },
    });
    const res = await DELETE(req, { params: Promise.resolve({ keyId: FAKE_KEY_ID }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(ApiKey.findByIdAndUpdate).toHaveBeenCalledWith(
      FAKE_KEY_ID,
      expect.objectContaining({ $set: expect.objectContaining({ revokedAt: expect.any(Date) }) }),
    );
  });
});
