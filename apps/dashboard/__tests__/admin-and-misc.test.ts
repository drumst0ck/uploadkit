import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({
  user: null as any,
  files: [] as any[],
  nonces: new Set<string>(),
  applied: 0,
  session: { user: { id: 'u1', email: 'admin@x.com' } } as any,
  welcomeFails: false,
  cf: { created: [] as string[], deleted: [] as string[], failCreate: false },
}));

vi.mock('../auth', () => ({ auth: async () => h.session }));
vi.mock('@uploadkitdev/emails', () => ({
  sendWelcomeEmail: async () => {
    if (h.welcomeFails) throw new Error('render failed');
  },
}));
vi.mock('@uploadkitdev/cloudflare', () => ({
  getCloudflareOAuthConfig: () => ({ id: 'c' }),
  getCloudflareConfig: () => ({ cnameTarget: 'cname.test' }),
  exchangeCloudflareOAuthCode: async () => ({ accessToken: 't' }),
  applyCdnValidationRecords: async () => { h.applied++; },
  createCustomHostname: async (_c: any, hostname: string) => {
    if (h.cf.failCreate) throw new Error('cf create failed');
    h.cf.created.push(hostname);
    return { id: `new-${hostname}`, hostname, status: 'pending', validationRecords: [] };
  },
  deleteCustomHostname: async (_c: any, id: string) => { h.cf.deleted.push(id); },
  getCustomHostname: async () => null,
}));
vi.mock('@uploadkitdev/db', () => ({
  connectDB: async () => undefined,
  User: { findById: () => ({ select: () => ({ lean: async () => h.user }) }) },
  Project: {
    findOne: () => {
      const r = { customCdnDomain: 'cdn.example.com', customCdnValidationRecords: [] };
      const p: any = Promise.resolve(r);
      return p;
    },
  },
  OAuthStateNonce: {
    create: async ({ nonce }: any) => {
      if (h.nonces.has(nonce)) throw Object.assign(new Error('dup'), { code: 11000 });
      h.nonces.add(nonce);
    },
  },
  File: {
    aggregate: async (pipeline: any[]) => {
      const rows = new Map<string, { _id: string; count: number; size: number }>();
      for (const f of h.files) {
        if (f.deletedAt) continue;
        const r = rows.get(f.projectId) ?? { _id: f.projectId, count: 0, size: 0 };
        r.count++; r.size += f.size;
        rows.set(f.projectId, r);
      }
      return [...rows.values()];
    },
  },
}));

import { isAdminSession } from '@/lib/admin';
import { escapeRegex } from '@/lib/regex';
import { getUserFileStats } from '@/lib/admin-stats';
import { sendWelcomeEmailSafe } from '@/lib/welcome-email';
import { createCloudflareOAuthState } from '@/lib/cloudflare-oauth-state';
import { GET as OAUTH_CALLBACK } from '@/app/api/internal/cloudflare/oauth/callback/route';
import { applyCustomHostnameToProject } from '@/lib/custom-cdn';

beforeEach(() => {
  process.env.ADMIN_EMAILS = 'admin@x.com';
  delete process.env.ADMIN_USER_IDS;
  process.env.AUTH_SECRET = 'secret-for-tests';
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.test';
  h.user = { email: 'admin@x.com', emailVerified: new Date() };
  h.session = { user: { id: 'u1', email: 'admin@x.com' } };
  h.nonces.clear();
  h.applied = 0;
  h.welcomeFails = false;
  h.cf = { created: [], deleted: [], failCreate: false };
});

describe('row 36: admin access', () => {
  it('grants admin to a verified account whose stored email is allowlisted', async () => {
    expect(await isAdminSession(h.session)).toBe(true);
  });
  it('denies a matching email that is not verified', async () => {
    h.user = { email: 'admin@x.com', emailVerified: null };
    expect(await isAdminSession(h.session)).toBe(false);
  });
  it('denies when the stored email differs from the session claim', async () => {
    h.user = { email: 'other@x.com', emailVerified: new Date() };
    expect(await isAdminSession(h.session)).toBe(false);
  });
  it('allows an unverified account only through the user-id allowlist', async () => {
    h.user = { email: 'admin@x.com', emailVerified: null };
    process.env.ADMIN_USER_IDS = 'zzz, u1';
    expect(await isAdminSession(h.session)).toBe(true);
  });
  it('denies anonymous sessions', async () => {
    expect(await isAdminSession(null)).toBe(false);
  });
});

describe('row 81: escapeRegex', () => {
  it('turns user input into a literal pattern', () => {
    const q = 'a.b(c+)*[x]';
    expect(() => new RegExp(escapeRegex(q))).not.toThrow();
    expect(new RegExp(escapeRegex(q)).test('a.b(c+)*[x]')).toBe(true);
    expect(new RegExp(escapeRegex('a.c')).test('abc')).toBe(false);
    expect(() => new RegExp('(')).toThrow(); // sanity: raw input would have thrown
  });
});

describe('row 82: admin file stats', () => {
  it('counts all files, not just the latest 50', async () => {
    h.files = Array.from({ length: 120 }, (_, i) => ({ projectId: i % 2 ? 'a' : 'b', size: 10, deletedAt: null }));
    h.files.push({ projectId: 'a', size: 999, deletedAt: new Date() });
    const stats = await getUserFileStats(['a', 'b'] as any);
    expect(stats.total).toBe(120);
    expect(stats.totalSize).toBe(1200);
    expect(stats.byProject.get('a')).toBe(60);
  });
});

describe('row 83: welcome email', () => {
  it('swallows render/send failures instead of leaving an unhandled rejection', async () => {
    h.welcomeFails = true;
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(sendWelcomeEmailSafe('a@b.c', 'A')).resolves.toBeUndefined();
    expect(err).toHaveBeenCalled();
  });
});

describe('row 85: Cloudflare OAuth state is single-use', () => {
  const callback = (state: string) =>
    OAUTH_CALLBACK(new NextRequest(`https://app.test/api/internal/cloudflare/oauth/callback?code=c&state=${encodeURIComponent(state)}`));
  it('accepts the first callback and rejects a replay of the same state', async () => {
    const state = createCloudflareOAuthState({ userId: 'u1', slug: 'proj', domain: 'cdn.example.com', origin: 'https://app.test' });
    const first = await callback(state);
    expect(first.status).toBe(307);
    expect(h.applied).toBe(1);
    const replay = await callback(state);
    expect(replay.status).toBe(400);
    expect(h.applied).toBe(1);
  });
});

describe('row 32: custom hostname replacement order', () => {
  const project: any = { customCdnHostnameId: 'old-id', customCdnDomain: 'old.example.com' };
  it('keeps the old hostname when creating the new one fails', async () => {
    h.cf.failCreate = true;
    await expect(applyCustomHostnameToProject(project, 'new.example.com')).rejects.toThrow('cf create failed');
    expect(h.cf.deleted).toEqual([]);
  });
  it('removes the old hostname only after the new one exists', async () => {
    const state = await applyCustomHostnameToProject(project, 'new.example.com');
    expect(state.id).toBe('new-new.example.com');
    expect(h.cf.deleted).toEqual(['old-id']);
  });
});
