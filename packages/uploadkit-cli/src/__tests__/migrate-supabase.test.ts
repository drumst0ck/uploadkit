import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MigrationStateStore, loadState } from '../migrate/state.js';
import { runPool } from '../migrate/pool.js';
import { createSupabaseClient } from '../migrate/supabase.js';
import { fetchProjectInfo } from '../migrate/uploadkit.js';
import { run } from '../commands/migrate-supabase.js';
import type { ParsedArgs } from '../args.js';
import type { MigrationState } from '../migrate/types.js';

let workDir: string;

function tmpFile(name: string): string {
  return join(workDir, name);
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'uploadkit-migrate-'));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe('MigrationStateStore', () => {
  it('appends entries and flushes atomically', async () => {
    const path = tmpFile('state.json');
    const store = new MigrationStateStore(path, null);
    store.appendEntry({
      oldUrl: 'https://supa.co/storage/v1/object/public/b/a.png',
      newUrl: 'https://cdn.uploadkit.dev/x/a.png',
      key: 'a.png',
      size: 100,
      contentType: 'image/png',
      migratedAt: '2026-07-01T00:00:00Z',
    });
    await store.flush({ bucket: 'b', route: 'default', startedAt: '2026-07-01T00:00:00Z' });

    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as MigrationState;
    expect(parsed.version).toBe(1);
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0]?.newUrl).toContain('cdn.uploadkit.dev');
  });

  it('detects already-migrated URLs on resume', async () => {
    const path = tmpFile('state.json');
    const seed: MigrationState = {
      version: 1,
      startedAt: '2026-07-01T00:00:00Z',
      bucket: 'b',
      route: 'default',
      entries: [
        {
          oldUrl: 'https://supa.co/storage/v1/object/public/b/a.png',
          newUrl: 'https://cdn.uploadkit.dev/x/a.png',
          key: 'a.png',
          size: 100,
          contentType: 'image/png',
          migratedAt: '2026-07-01T00:00:00Z',
        },
      ],
      failures: [],
    };
    writeFileSync(path, JSON.stringify(seed));
    const loaded = await loadState(path);
    expect(loaded).not.toBeNull();
    expect(loaded?.entries).toHaveLength(1);

    const store = new MigrationStateStore(path, loaded);
    expect(store.has('https://supa.co/storage/v1/object/public/b/a.png')).toBe(true);
    expect(store.has('https://supa.co/storage/v1/object/public/b/other.png')).toBe(false);
  });

  it('serializes overlapping flushes without losing newer entries', async () => {
    const path = tmpFile('state.json');
    const store = new MigrationStateStore(path, null);
    const meta = { bucket: 'b', route: 'default', startedAt: '2026-07-01T00:00:00Z' };
    const entry = (key: string) => ({
      oldUrl: `https://supa.co/${key}`,
      newUrl: `https://cdn.uploadkit.dev/${key}`,
      key,
      size: 1,
      contentType: 'text/plain',
      migratedAt: '2026-07-01T00:00:00Z',
    });

    store.appendEntry(entry('first'));
    const firstFlush = store.flush(meta);
    store.appendEntry(entry('second'));
    const secondFlush = store.flush(meta);
    await Promise.all([firstFlush, secondFlush]);

    const state = JSON.parse(readFileSync(path, 'utf8')) as MigrationState;
    expect(state.entries.map((item) => item.key)).toEqual(['first', 'second']);
  });

  it('returns null when the mapping file does not exist', async () => {
    const loaded = await loadState(tmpFile('nope.json'));
    expect(loaded).toBeNull();
  });

  it('throws a clear error on corrupt JSON', async () => {
    const path = tmpFile('corrupt.json');
    writeFileSync(path, '{ not valid json');
    await expect(loadState(path)).rejects.toThrow(/not valid JSON/);
  });
});

describe('runPool', () => {
  it('runs workers with bounded concurrency and processes every item', async () => {
    const processed: number[] = [];
    const items = Array.from({ length: 50 }, (_, i) => i);
    let peak = 0;
    let active = 0;

    await runPool(
      items,
      async (n) => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 5));
        processed.push(n);
        active--;
      },
      { concurrency: 4 },
    );

    expect(processed).toHaveLength(50);
    expect(processed.sort((a, b) => a - b)).toEqual(items);
    expect(peak).toBeLessThanOrEqual(4);
  });

  it('settles promptly after an abort and stops taking new work', async () => {
    const ac = new AbortController();
    const seen: string[] = [];

    const result = runPool(
      ['a', 'b', 'c'],
      async (item) => {
        seen.push(item);
        ac.abort();
      },
      { concurrency: 1, signal: ac.signal },
    );

    await expect(result).resolves.toBeUndefined();
    expect(seen).toEqual(['a']);
  });

  it('rejects when the source iterator fails instead of hanging', async () => {
    async function* brokenSource() {
      yield 'first';
      throw new Error('page failed');
    }

    await expect(runPool(brokenSource(), async () => {}, { concurrency: 2 })).rejects.toThrow(
      'page failed',
    );
  });
});

describe('Supabase migration clients', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('recursively lists objects and returns bucket-relative keys', async () => {
    globalThis.fetch = vi.fn(async (_input: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { prefix: string };
      if (body.prefix === '') {
        return new Response(JSON.stringify([
          { name: 'root.txt', id: '1', metadata: { size: 1, mimetype: 'text/plain' } },
          { name: 'nested', id: null, metadata: null },
        ]));
      }
      if (body.prefix === 'nested') {
        return new Response(JSON.stringify([
          { name: 'child.txt', id: '2', metadata: { size: 2, mimetype: 'text/plain' } },
        ]));
      }
      return new Response(JSON.stringify([]));
    }) as typeof fetch;

    const client = createSupabaseClient('https://supa.supabase.co', 'secret', 'bucket');
    const keys: string[] = [];
    for await (const page of client.list(undefined)) {
      keys.push(...page.map((object) => object.name));
    }

    expect(keys.sort()).toEqual(['nested/child.txt', 'root.txt']);
  });

  it('propagates UploadKit authentication failures', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })) as typeof fetch;

    await expect(fetchProjectInfo('https://api.uploadkit.dev', 'bad-key')).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});

describe('migrate-supabase command (mocked)', () => {
  const originalFetch = globalThis.fetch;

  function mockFetch(handlers: Array<(url: string, init?: RequestInit) => Response | Promise<Response>>): typeof fetch {
    return vi.fn(async (input: unknown, init?: RequestInit) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : typeof input === 'object' && input !== null && 'url' in input
              ? String((input as { url: unknown }).url)
              : String(input);
      for (const h of handlers) {
        const resp = await h(url, init);
        if (resp) return resp;
      }
      return new Response('not mocked', { status: 500 });
    }) as unknown as typeof fetch;
  }

  function jsonResp(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }

  function makeArgs(flags: Partial<ParsedArgs['flags']> = {}): ParsedArgs {
    return {
      command: 'migrate-supabase',
      positional: [],
      flags: {
        version: false,
        help: false,
        yes: true,
        skipInstall: false,
        latest: false,
        target: undefined,
        timestamp: undefined,
        supabaseUrl: 'https://supa.supabase.co',
        supabaseKey: 'service-role',
        supabaseBucket: 'b',
        uploadkitKey: 'uk_live_test',
        uploadkitRoute: 'default',
        uploadkitApi: 'https://api.uploadkit.dev',
        prefix: undefined,
        concurrency: 2,
        out: tmpFile('out.json'),
        resume: undefined,
        dryRun: false,
        mapping: undefined,
        glob: undefined,
        extra: {},
        ...flags,
      },
    };
  }

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('happy path migrates all objects and writes mapping', async () => {
    // Supabase bucket list returns one page of 3 files, then an empty page.
    const supaObjects = [
      { name: 'a.png', id: '1', metadata: { size: 100, mimetype: 'image/png' } },
      { name: 'b.png', id: '2', metadata: { size: 200, mimetype: 'image/png' } },
      { name: 'c.png', id: '3', metadata: { size: 300, mimetype: 'image/png' } },
    ];
    let listCalls = 0;
    let putCalls = 0;

    globalThis.fetch = mockFetch([
      (url) => {
        // UploadKit connectivity probe — /projects/me
        if (url.endsWith('/api/v1/projects/me')) {
          return jsonResp({ project: { _id: 'p1', tier: 'PRO' }, tier: 'PRO' });
        }
        return undefined as unknown as Response;
      },
      (url, init) => {
        // Supabase bucket list — paginate by offset, terminator-aware so the
        // generator can be iterated multiple times (validate / countOversized / loop).
        if (url.includes('/storage/v1/object/list/')) {
          listCalls++;
          const body = JSON.parse(String(init?.body ?? '{}')) as { limit: number; offset: number };
          const start = body.offset ?? 0;
          const slice = supaObjects.slice(start, start + body.limit);
          return jsonResp(slice);
        }
        return undefined as unknown as Response;
      },
      (url, init) => {
        // UploadKit upload request
        if (url.endsWith('/api/v1/upload/request')) {
          const body = JSON.parse(String(init?.body ?? '{}')) as { fileName: string };
          return jsonResp({
            fileId: `file-${body.fileName}`,
            uploadUrl: `https://r2.test/upload/${body.fileName}`,
            key: `p1/default/x/${body.fileName}`,
            cdnUrl: `https://cdn.uploadkit.dev/p1/default/x/${body.fileName}`,
          });
        }
        return undefined as unknown as Response;
      },
      (url) => {
        // Supabase object GET — returns a small binary body for streaming.
        if (url.includes('/storage/v1/object/authenticated/')) {
          return new Response(new Uint8Array([1, 2, 3, 4, 5]), { status: 200 });
        }
        return undefined as unknown as Response;
      },
      (url, init) => {
        // Presigned PUT to R2
        if (url.startsWith('https://r2.test/upload/')) {
          putCalls++;
          // Consume body — init.body is a Readable stream.
          void init;
          return new Response(null, { status: 200 });
        }
        return undefined as unknown as Response;
      },
      (url, init) => {
        // UploadKit complete
        if (url.endsWith('/api/v1/upload/complete')) {
          const body = JSON.parse(String(init?.body ?? '{}')) as { fileId: string };
          return jsonResp({ file: { _id: body.fileId, url: `https://cdn.uploadkit.dev/${body.fileId}` } });
        }
        return undefined as unknown as Response;
      },
    ]);

    const args = makeArgs();
    const code = await run(args);

    expect(code).toBe(0);
    expect(putCalls).toBe(3);
    expect(listCalls).toBeGreaterThan(0);

    const mapping = JSON.parse(readFileSync(args.flags.out!, 'utf8')) as MigrationState;
    expect(mapping.entries).toHaveLength(3);
    for (const e of mapping.entries) {
      expect(e.oldUrl).toContain('supabase.co/storage/v1/object/public/b/');
      expect(e.newUrl).toContain('cdn.uploadkit.dev');
    }
  });

  it('--dry-run lists but does not upload', async () => {
    const supaObjects = [
      { name: 'a.png', id: '1', metadata: { size: 100, mimetype: 'image/png' } },
    ];
    let listCalls = 0;
    let putCalls = 0;
    let requestCalls = 0;

    globalThis.fetch = mockFetch([
      (url) => {
        if (url.endsWith('/api/v1/projects/me')) return jsonResp({ tier: 'PRO' });
        return undefined as unknown as Response;
      },
      (url, init) => {
        if (url.includes('/storage/v1/object/list/')) {
          listCalls++;
          const body = JSON.parse(String(init?.body ?? '{}')) as { limit: number; offset: number };
          return jsonResp(supaObjects.slice(body.offset ?? 0, (body.offset ?? 0) + body.limit));
        }
        return undefined as unknown as Response;
      },
      (url) => {
        if (url.endsWith('/api/v1/upload/request')) {
          requestCalls++;
          return jsonResp({ fileId: 'f', uploadUrl: 'https://r2.test', key: 'k', cdnUrl: 'c' });
        }
        return undefined as unknown as Response;
      },
      (url) => {
        if (url.startsWith('https://r2.test/upload/')) {
          putCalls++;
          return new Response(null, { status: 200 });
        }
        return undefined as unknown as Response;
      },
    ]);

    const args = makeArgs({ dryRun: true });
    const code = await run(args);
    expect(code).toBe(0);
    expect(listCalls).toBeGreaterThan(0);
    expect(requestCalls).toBe(0);
    expect(putCalls).toBe(0);
    expect(existsSync(args.flags.out!)).toBe(false);
  });
});
