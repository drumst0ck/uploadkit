import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const chain = (rows: unknown) => ({
  select: () => ({ lean: async () => rows }),
});

const DAY = 24 * 60 * 60 * 1000;
const old = new Date(Date.now() - 60 * DAY);
const recent = new Date(Date.now() - 2 * DAY);

const db = vi.hoisted(() => ({
  users: [] as any[],
  apiKeys: [] as any[],
  projects: [] as any[],
  files: [] as any[],
}));

vi.mock('@uploadkitdev/db', () => {
  const inSet = (v: any, set: any[]) => set.map(String).includes(String(v));
  return {
    connectDB: vi.fn().mockResolvedValue(undefined),
    Subscription: { find: () => chain([]) },
    User: {
      find: (filter: any) => {
        const lt = filter.lastLoginAt?.$lt as Date | undefined;
        const gte = filter.lastLoginAt?.$gte as Date | undefined;
        return chain(
          db.users.filter(
            (u) => (!lt || u.lastLoginAt < lt) && (!gte || u.lastLoginAt >= gte),
          ),
        );
      },
      updateOne: vi.fn().mockResolvedValue({}),
    },
    ApiKey: {
      find: (filter: any) => {
        const gte = filter.lastUsedAt?.$gte as Date;
        return chain(db.apiKeys.filter((k) => k.lastUsedAt && k.lastUsedAt >= gte));
      },
    },
    Project: {
      find: (filter: any) => {
        if (filter._id) return chain(db.projects.filter((p) => inSet(p._id, filter._id.$in)));
        return chain(db.projects.filter((p) => String(p.userId) === String(filter.userId)));
      },
    },
    File: {
      find: (filter: any) =>
        chain(db.files.filter((f) => inSet(f.projectId, filter.projectId.$in))),
      updateMany: vi.fn().mockResolvedValue({}),
      countDocuments: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue([]),
    },
    UsageRecord: { findOneAndUpdate: vi.fn().mockResolvedValue({}) },
  };
});

vi.mock('@uploadkitdev/emails', () => ({
  sendInactiveWarningEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/storage', () => ({
  r2Client: { send: vi.fn().mockResolvedValue({}) },
  R2_BUCKET: 'test-bucket',
}));

import { GET } from '@/app/api/cron/inactive-cleanup/route';
import { File } from '@uploadkitdev/db';
import { r2Client } from '@/lib/storage';
import { sendInactiveWarningEmail } from '@uploadkitdev/emails';

const call = () =>
  GET(
    new NextRequest('http://localhost/api/cron/inactive-cleanup', {
      headers: { 'x-cron-secret': 'test-cron-secret' },
    }),
  );

describe('GET /api/cron/inactive-cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.users = [
      { _id: 'sdk-user', email: 'sdk@x.dev', lastLoginAt: old },
      { _id: 'idle-user', email: 'idle@x.dev', lastLoginAt: old },
    ];
    db.projects = [
      { _id: 'p-sdk', userId: 'sdk-user' },
      { _id: 'p-idle', userId: 'idle-user' },
    ];
    db.files = [
      { _id: 'f-sdk', projectId: 'p-sdk', key: 'sdk/file', size: 10 },
      { _id: 'f-idle', projectId: 'p-idle', key: 'idle/file', size: 10 },
    ];
    db.apiKeys = [
      { _id: 'k1', projectId: 'p-sdk', lastUsedAt: recent },
      { _id: 'k2', projectId: 'p-idle', lastUsedAt: old },
    ];
  });

  it('keeps files of a user who never logs in but whose API key was used recently', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    const sent = vi.mocked(r2Client.send).mock.calls.map((c) => (c[0] as any).input.Key);
    expect(sent).not.toContain('sdk/file');
    const updated = vi.mocked(File.updateMany).mock.calls.flatMap((c) => (c[0] as any)._id.$in);
    expect(updated).not.toContain('f-sdk');
  });

  it('still cleans files of a truly inactive user', async () => {
    const body = await (await call()).json();
    const sent = vi.mocked(r2Client.send).mock.calls.map((c) => (c[0] as any).input.Key);
    expect(sent).toEqual(['idle/file']);
    expect(body.filesRemoved).toBe(1);
  });

  it('does not send an inactivity warning to an SDK-active user', async () => {
    db.users = [{ _id: 'sdk-user', email: 'sdk@x.dev', lastLoginAt: new Date(Date.now() - 25 * DAY) }];
    await call();
    expect(sendInactiveWarningEmail).not.toHaveBeenCalled();
  });
});
