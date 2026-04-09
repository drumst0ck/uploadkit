import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@uploadkitdev/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  File: {
    find: vi.fn(),
    deleteOne: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/lib/storage', () => ({
  r2Client: {
    send: vi.fn().mockResolvedValue({}),
  },
  R2_BUCKET: 'test-bucket',
  CDN_URL: 'https://cdn.uploadkit.dev',
}));

import { GET } from '@/app/api/cron/cleanup/route';
import { File } from '@uploadkitdev/db';
import { r2Client } from '@/lib/storage';

const CRON_SECRET = 'test-cron-secret';

describe('GET /api/cron/cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires valid cron secret header', async () => {
    vi.mocked(File.find).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/cron/cleanup', {
      headers: { 'x-cron-secret': 'wrong-secret' },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('marks stale UPLOADING files as cleaned (deletes them from DB)', async () => {
    const staleFile = {
      _id: 'file-stale-1',
      key: 'proj/slug/abc/file.jpg',
      uploadId: null,
    };
    vi.mocked(File.find).mockResolvedValue([staleFile] as any);
    vi.mocked(File.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

    const req = new NextRequest('http://localhost/api/cron/cleanup', {
      headers: { 'x-cron-secret': CRON_SECRET },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.cleaned).toBe(1);
    expect(File.deleteOne).toHaveBeenCalledWith({ _id: 'file-stale-1' });
  });

  it('deletes corresponding R2 objects for stale uploads', async () => {
    const staleFile = {
      _id: 'file-stale-2',
      key: 'proj/slug/xyz/photo.png',
      uploadId: null,
    };
    vi.mocked(File.find).mockResolvedValue([staleFile] as any);
    vi.mocked(File.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);
    vi.mocked(r2Client.send).mockResolvedValue({} as any);

    const req = new NextRequest('http://localhost/api/cron/cleanup', {
      headers: { 'x-cron-secret': CRON_SECRET },
    });
    await GET(req);

    // r2Client.send should have been called with a DeleteObjectCommand
    expect(r2Client.send).toHaveBeenCalled();
    const callArg = vi.mocked(r2Client.send).mock.calls[0]![0] as any;
    expect(callArg.input.Key).toBe('proj/slug/xyz/photo.png');
    expect(callArg.input.Bucket).toBe('test-bucket');
  });
});
