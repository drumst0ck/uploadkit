import { describe, expect, it } from 'vitest';

const PROJECT = '64b7f0a1c2d3e4f5a6b7c8d9';
const SECRET = 'cdn-signing-secret-for-tests';

function fakeEnv(objects: Record<string, { body?: string; contentType?: string | undefined }>) {
  return {
    IMAGE_TRANSFORM_SECRET: SECRET,
    UPLOADS: {
      async get(key: string) {
        const o = objects[key];
        if (!o) return null;
        return { body: new Response(o.body ?? 'x').body!, httpMetadata: { contentType: o.contentType } };
      },
      async head(key: string) {
        return objects[key] ? {} : null;
      },
    },
  } as never;
}

async function sign(exp: number, key: string, secret = SECRET) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(`cdn\n${exp}\n${key}`)));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function get(env: never, path: string, host = 'cdn.uploadkit.dev') {
  const { default: worker } = await import('../src/index');
  return worker.fetch(new Request(`https://${host}${path}`), env, { waitUntil() {} } as never);
}

import { beforeEach } from 'vitest';

describe('raw object serving', () => {
  beforeEach(async () => {
    (await import('../src/index')).resetAclCache();
  });

  it('serves HTML as a non-inline download with locked-down headers', async () => {
    const key = `${PROJECT}/r/abc/evil.html`;
    const res = await get(fakeEnv({ [key]: { body: '<script>1</script>', contentType: 'text/html' } }), `/${key}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toMatch(/^attachment/);
    expect(res.headers.get('content-type')).toBe('application/octet-stream');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(res.headers.get('content-security-policy')).toContain('sandbox');
  });

  it('serves PDF inline without a sandbox CSP so browser PDF viewers can render it', async () => {
    const key = `${PROJECT}/r/abc/doc`;
    const res = await get(fakeEnv({ [key]: { contentType: 'application/pdf' } }), `/${key}`);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toBeNull();
    expect(res.headers.get('content-security-policy')).toBeNull();
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('serves SVG inline but sandboxed so scripts cannot run on navigation', async () => {
    for (const ct of ['image/svg+xml']) {
      const key = `${PROJECT}/r/abc/f`;
      const res = await get(fakeEnv({ [key]: { contentType: ct } }), `/${key}`);
      expect(res.headers.get('content-type')).toBe(ct);
      expect(res.headers.get('content-disposition')).toBeNull();
      expect(res.headers.get('content-security-policy'))
        .toBe("default-src 'none'; style-src 'unsafe-inline'; sandbox");
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    }
  });

  it('never serves HTML, XML, JS or unknown types inline', async () => {
    for (const ct of ['text/html', 'application/xhtml+xml', 'application/xml', 'text/xml', 'application/javascript', 'text/plain', undefined]) {
      const key = `${PROJECT}/r/abc/f`;
      const res = await get(fakeEnv({ [key]: { contentType: ct } }), `/${key}`);
      expect(res.headers.get('content-disposition')).toMatch(/^attachment/);
      expect(res.headers.get('content-type')).toBe('application/octet-stream');
    }
  });

  it('keeps raster images inline and does not cache for a year', async () => {
    const key = `${PROJECT}/r/abc/p.png`;
    const res = await get(fakeEnv({ [key]: { contentType: 'image/png' } }), `/${key}`);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('content-disposition')).toBeNull();
    expect(res.headers.get('cache-control')).not.toMatch(/immutable|31536000/);
  });

  it('404s keys that are not under a project id prefix and the ACL namespace', async () => {
    const env = fakeEnv({ 'random/file.png': { contentType: 'image/png' }, [`_acl/${PROJECT}`]: {} });
    expect((await get(env, '/random/file.png')).status).toBe(404);
    expect((await get(env, `/_acl/${PROJECT}`)).status).toBe(404);
    expect((await get(env, '/')).status).toBe(404);
  });

  it('requires a valid unexpired signature when the project is signed', async () => {
    const key = `${PROJECT}/r/abc/p.png`;
    const env = fakeEnv({ [key]: { contentType: 'image/png' }, [`_acl/${PROJECT}`]: {} });
    const exp = Math.floor(Date.now() / 1000) + 600;
    expect((await get(env, `/${key}`)).status).toBe(403);
    expect((await get(env, `/${key}?exp=${exp}&sig=${await sign(exp, key)}`)).status).toBe(200);
    expect((await get(env, `/${key}?exp=${exp}&sig=${await sign(exp, key, 'other')}`)).status).toBe(403);
    expect((await get(env, `/${key}?exp=${exp + 1}&sig=${await sign(exp, key)}`)).status).toBe(403);
    const past = Math.floor(Date.now() / 1000) - 5;
    expect((await get(env, `/${key}?exp=${past}&sig=${await sign(past, key)}`)).status).toBe(403);
  });

  it('caches the project ACL lookup for 60 seconds per isolate', async () => {
    const key = `${PROJECT}/r/abc/p.png`;
    let heads = 0;
    const env = fakeEnv({ [key]: { contentType: 'image/png' } }) as { UPLOADS: { head(k: string): Promise<unknown> } };
    const original = env.UPLOADS.head.bind(env.UPLOADS);
    env.UPLOADS.head = async (k: string) => { heads++; return original(k); };
    await get(env as never, `/${key}`);
    await get(env as never, `/${key}`);
    expect(heads).toBe(1);
  });

  it('does not intercept first-party hostnames', async () => {
    const { shouldPassThrough } = await import('../src/index');
    expect(shouldPassThrough('app.uploadkit.dev')).toBe(true);
    expect(shouldPassThrough('API.uploadkit.dev')).toBe(true);
    expect(shouldPassThrough('uploadkit.dev')).toBe(true);
    expect(shouldPassThrough('docs.uploadkit.dev')).toBe(true);
    expect(shouldPassThrough('cdn.uploadkit.dev')).toBe(false);
    expect(shouldPassThrough('cdn.customer.com')).toBe(false);
  });

  it('answers 405 only after pass-through, so first-party hosts never get 405', async () => {
    const { default: worker } = await import('../src/index');
    const original = globalThis.fetch;
    globalThis.fetch = (async () => new Response('origin', { status: 200 })) as never;
    try {
      const post = (host: string) => worker.fetch(
        new Request(`https://${host}/x`, { method: 'POST' }), fakeEnv({}), { waitUntil() {} } as never);
      expect((await post('app.uploadkit.dev')).status).toBe(200);
      expect((await post('cdn.uploadkit.dev')).status).toBe(405);
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe('image transform paths honour project prefix and access mode', () => {
  const PUBLIC_SECRET = 'a-different-public-secret-for-tests';
  const TRANSFORM = 'w_100,fit_cover,q_80,f_webp';

  async function hmac(secret: string, payload: string) {
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(payload)));
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function transformEnv(objects: Record<string, { contentType?: string | undefined }>) {
    const base = fakeEnv(objects) as unknown as Record<string, unknown>;
    return {
      ...base,
      IMAGE_TRANSFORM_PUBLIC_SECRET: PUBLIC_SECRET,
      IMAGES: {
        input: () => ({
          transform() { return this; },
          async output() { return { response: () => new Response('img', { headers: { 'content-type': 'image/webp' } }) }; },
        }),
      },
    } as never;
  }

  beforeEach(async () => {
    (await import('../src/index')).resetAclCache();
    (globalThis as { caches?: unknown }).caches = { default: { match: async () => undefined, put: async () => undefined } };
  });

  async function publicUrl(key: string) {
    return `/p/${await hmac(PUBLIC_SECRET, `public\n${TRANSFORM}\n${key}`)}/${TRANSFORM}/${key}`;
  }
  async function signedUrl(key: string, exp = Math.floor(Date.now() / 1000) + 600) {
    return `/t/${exp}/${await hmac(SECRET, `${exp}\n${TRANSFORM}\n${key}`)}/${TRANSFORM}/${key}`;
  }

  it('refuses keys outside a project-id prefix with 404', async () => {
    const key = 'random/file.png';
    const env = transformEnv({ [key]: { contentType: 'image/png' } });
    expect((await get(env, await publicUrl(key))).status).toBe(404);
    expect((await get(env, await signedUrl(key))).status).toBe(404);
  });

  it('serves /p/ transforms for PUBLIC projects', async () => {
    const key = `${PROJECT}/r/abc/p.png`;
    const res = await get(transformEnv({ [key]: { contentType: 'image/png' } }), await publicUrl(key));
    expect(res.status).toBe(200);
  });

  it('refuses non-expiring /p/ transforms for SIGNED projects with 403', async () => {
    const key = `${PROJECT}/r/abc/p.png`;
    const env = transformEnv({ [key]: { contentType: 'image/png' }, [`_acl/${PROJECT}`]: {} });
    const res = await get(env, await publicUrl(key));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe('PUBLIC_DELIVERY_DISABLED');
  });

  it('still serves expiring /t/ transforms for SIGNED projects', async () => {
    const key = `${PROJECT}/r/abc/p.png`;
    const env = transformEnv({ [key]: { contentType: 'image/png' }, [`_acl/${PROJECT}`]: {} });
    expect((await get(env, await signedUrl(key))).status).toBe(200);
    const past = Math.floor(Date.now() / 1000) - 10;
    expect((await get(env, await signedUrl(key, past))).status).toBe(403);
  });
});

