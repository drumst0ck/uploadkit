import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('@/lib/user-quota', () => ({ withUserQuotaLock: async (_id: unknown, work: () => Promise<unknown>) => work() }));
vi.mock('@/lib/with-api-key', () => ({ withApiKey: (handler: any) => (req: NextRequest) => handler(req, { project: { _id: '507f1f77bcf86cd799439011', userId: 'user' }, tier: 'FREE' }) }));
vi.mock('@uploadkitdev/db', () => ({ connectDB: vi.fn() }));
import { DELETE as bulkDelete } from '@/app/api/v1/files/route';
import { serializeError } from '@/lib/errors';

describe('audit input and conflict responses', () => {
  it('returns INVALID_JSON 400 for malformed request JSON', async () => {
    const res = await bulkDelete(new NextRequest('http://localhost/api/v1/files', { method: 'DELETE', body: '{"keys":' }), { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_JSON');
  });
  it('returns 409 for duplicate custom CDN hostname claims', async () => {
    const res = serializeError({ code: 11000, keyPattern: { customCdnDomain: 1 } });
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('CDN_DOMAIN_IN_USE');
  });
  it('keeps programming SyntaxErrors as server errors', () => {
    expect(serializeError(new SyntaxError('bad internal expression')).status).toBe(500);
  });
});
