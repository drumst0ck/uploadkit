import { Readable } from 'node:stream';
import type { SupabaseObject } from './types';

/**
 * Minimal Supabase Storage REST client. Uses the service_role key which
 * bypasses RLS — callers must be warned in the CLI surface (help text +
 * prompt) that this key grants full bucket access.
 *
 * Docs: https://supabase.com/docs/reference/storage/ — endpoint paths used
 * here are stable as of 2025.
 */

const LIST_PAGE_SIZE = 1000;

export interface SupabaseClient {
  /** Returns the public URL for an object — this becomes `oldUrl` in mapping. */
  publicUrl(key: string): string;
  /** Paginated listing of objects under a prefix. Filters out folders. */
  list(prefix: string | undefined): AsyncIterable<SupabaseObject[]>;
  /** HEADs an object — returns content-length + content-type. */
  head(key: string): Promise<{ size: number; contentType: string }>;
  /** GETs an object as a Node Readable stream for piped upload. */
  stream(key: string, signal: AbortSignal | undefined): Promise<Readable>;
}

export function createSupabaseClient(baseUrl: string, serviceRoleKey: string, bucket: string): SupabaseClient {
  const trimmed = baseUrl.replace(/\/+$/, '');
  const auth = `Bearer ${serviceRoleKey}`;

  function bucketPath(path: string): string {
    return `${trimmed}/storage/v1/object/${path}/${encodeURIComponent(bucket)}`;
  }

  return {
    publicUrl(key) {
      const encoded = key.split('/').map(encodeURIComponent).join('/');
      return `${trimmed}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encoded}`;
    },

    async *list(prefix) {
      const pending = [normalizePrefix(prefix)];
      while (pending.length > 0) {
        const currentPrefix = pending.pop()!;
        let offset = 0;

        for (;;) {
          const url = `${trimmed}/storage/v1/object/list/${encodeURIComponent(bucket)}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: auth,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prefix: currentPrefix,
              limit: LIST_PAGE_SIZE,
              offset,
              sortBy: { column: 'name', order: 'asc' },
            }),
          });
          if (!res.ok) {
            const body = await safeText(res);
            throw new Error(`Supabase list failed (${res.status}): ${body}`);
          }

          const data = (await res.json()) as SupabaseObject[];
          const files: SupabaseObject[] = [];
          for (const object of data) {
            const name = joinObjectKey(currentPrefix, object.name);
            if (object.metadata && !object.name.endsWith('/')) {
              files.push({ ...object, name });
            } else if (name.length > 0 && name !== currentPrefix) {
              pending.push(name);
            }
          }
          if (files.length > 0) yield files;
          if (data.length < LIST_PAGE_SIZE) break;
          offset += data.length;
        }
      }
    },

    async head(key) {
      const res = await fetch(bucketPath(`authenticated/${encodeKey(key)}`), {
        method: 'HEAD',
        headers: { Authorization: auth },
      });
      if (!res.ok) {
        const body = await safeText(res);
        throw new Error(`Supabase HEAD failed for "${key}" (${res.status}): ${body}`);
      }
      const size = Number.parseInt(res.headers.get('content-length') ?? '0', 10);
      const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
      return { size: Number.isFinite(size) ? size : 0, contentType };
    },

    async stream(key, signal) {
      const res = await fetch(bucketPath(`authenticated/${encodeKey(key)}`), {
        method: 'GET',
        headers: { Authorization: auth },
        ...(signal ? { signal } : {}),
      });
      if (!res.ok || !res.body) {
        const body = await safeText(res);
        throw new Error(`Supabase GET failed for "${key}" (${res.status}): ${body}`);
      }
      // Web ReadableStream → Node Readable. Node 18+ supports this conversion
      // via Readable.fromWeb, which is the safest cross-runtime shape.
      return Readable.fromWeb(res.body as unknown as Parameters<typeof Readable.fromWeb>[0]);
    },
  };
}

/** Encodes an object key for path placement. Slashes are preserved (folders). */
function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

function normalizePrefix(prefix: string | undefined): string {
  return (prefix ?? '').replace(/^\/+|\/+$/g, '');
}

function joinObjectKey(prefix: string, name: string): string {
  const normalizedName = name.replace(/^\/+|\/+$/g, '');
  return prefix ? `${prefix}/${normalizedName}` : normalizedName;
}

async function safeText(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 500);
  } catch {
    return '<no body>';
  }
}
