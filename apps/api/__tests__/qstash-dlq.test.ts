import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  File: { findByIdAndUpdate: vi.fn().mockResolvedValue({}) },
}));
vi.mock('@upstash/qstash', () => ({
  Receiver: class {
    verify = vi.fn().mockResolvedValue(true);
  },
}));

import { POST } from '@/app/api/v1/webhooks/qstash-dlq/route';
import { File } from '@uploadkitdev/db';

const post = (body: unknown) =>
  POST(new NextRequest('http://localhost/api/v1/webhooks/qstash-dlq', {
    method: 'POST',
    headers: { 'upstash-signature': 'sig' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }));

describe('POST /api/v1/webhooks/qstash-dlq', () => {
  const env = { ...process.env };
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.QSTASH_CURRENT_SIGNING_KEY = 'k1';
    process.env.QSTASH_NEXT_SIGNING_KEY = 'k2';
  });
  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllEnvs();
  });

  it('fails closed (503) in production when signing keys are missing', async () => {
    delete process.env.QSTASH_CURRENT_SIGNING_KEY;
    delete process.env.QSTASH_NEXT_SIGNING_KEY;
    vi.stubEnv('NODE_ENV', 'production');
    const res = await post({ file: { id: '507f1f77bcf86cd799439011' } });
    expect(res.status).toBe(503);
    expect(File.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 (not 500) for an invalid ObjectId', async () => {
    const res = await post({ file: { id: 'not-an-id' } });
    expect(res.status).toBe(400);
    expect(File.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('records the failure for a valid file id', async () => {
    const res = await post({ file: { id: '507f1f77bcf86cd799439011' } });
    expect(res.status).toBe(200);
    expect(File.findByIdAndUpdate).toHaveBeenCalled();
  });
});
