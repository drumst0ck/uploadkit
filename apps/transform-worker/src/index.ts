interface Env {
  UPLOADS: R2Bucket;
  IMAGES: ImagesBinding;
  IMAGE_TRANSFORM_SECRET: string;
  IMAGE_TRANSFORM_SECRET_PREVIOUS?: string;
  IMAGE_TRANSFORM_PUBLIC_SECRET: string;
  CACHE_TTL_SECONDS?: string;
}

interface R2Bucket {
  get(key: string): Promise<{
    body: ReadableStream;
    httpMetadata?: { contentType?: string };
  } | null>;
  head(key: string): Promise<unknown | null>;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface ImagesBinding {
  input(stream: ReadableStream): ImagesInput;
}

interface ImagesInput {
  transform(options: ImageResizeOptions): ImagesInput;
  output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
}

interface ImageResizeOptions {
  width?: number;
  height?: number;
  fit: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
}

interface ImageTransform extends ImageResizeOptions {
  quality: number;
  format: 'auto' | 'avif' | 'webp' | 'jpeg' | 'png';
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return jsonError('METHOD_NOT_ALLOWED', 405, { Allow: 'GET, HEAD' });
    }

    const { hostname, pathname } = new URL(request.url);
    // The zone-wide route also catches first-party hosts (app/api/www/docs):
    // hand those straight back to their real origin.
    if (shouldPassThrough(hostname)) return fetch(request);
    if (pathname.startsWith('/t/') || pathname.startsWith('/p/')) {
      return handleImageTransform(request, env, ctx);
    }

    return serveRawObject(request, env);
  },
};

async function handleImageTransform(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
    const edgeCache = (caches as CacheStorage & { default: Cache }).default;
    const startedAt = Date.now();

    try {
      const parsed = parseTransformRequest(new URL(request.url));
      if (parsed.delivery === 'signed') {
        if (parsed.expires === null) return jsonError('INVALID_TRANSFORM_URL', 400);
        if (parsed.expires <= Math.floor(Date.now() / 1000)) {
          return jsonError('TRANSFORM_URL_EXPIRED', 403);
        }
      }
      if (!env.IMAGE_TRANSFORM_SECRET
        || (parsed.delivery === 'public' && (!env.IMAGE_TRANSFORM_PUBLIC_SECRET
          || env.IMAGE_TRANSFORM_PUBLIC_SECRET === env.IMAGE_TRANSFORM_SECRET))) {
        return jsonError('WORKER_NOT_CONFIGURED', 503);
      }

      const payload = parsed.delivery === 'public'
        ? publicSigningPayload(parsed.encodedTransform, parsed.key)
        : signingPayload(parsed.expires!, parsed.encodedTransform, parsed.key);
      const activeSecret = parsed.delivery === 'public'
        ? env.IMAGE_TRANSFORM_PUBLIC_SECRET
        : env.IMAGE_TRANSFORM_SECRET;
      const valid = await verifySignature(activeSecret, parsed.signature, payload)
        || (parsed.delivery === 'signed' && env.IMAGE_TRANSFORM_SECRET_PREVIOUS
          ? await verifySignature(env.IMAGE_TRANSFORM_SECRET_PREVIOUS, parsed.signature, payload)
          : false);
      if (!valid) return jsonError('INVALID_TRANSFORM_SIGNATURE', 403);

      const transform = decodeTransform(parsed.encodedTransform);
      const outputFormat = negotiateFormat(transform.format, request.headers.get('accept'));
      const cacheUrl = new URL(request.url);
      cacheUrl.search = '';
      cacheUrl.searchParams.set('uk-format', outputFormat);
      const cacheKey = new Request(cacheUrl);
      const cached = await edgeCache.match(cacheKey);
      if (cached) {
        const response = withOperationalHeaders(cached, 'HIT');
        logRequest('cache_hit', parsed.key, outputFormat, startedAt);
        return request.method === 'HEAD' ? headResponse(response) : response;
      }

      const source = await env.UPLOADS.get(parsed.key);
      if (!source?.body) return jsonError('SOURCE_NOT_FOUND', 404);
      const contentType = source.httpMetadata?.contentType ?? '';
      if (!contentType.startsWith('image/')) return jsonError('UNSUPPORTED_TRANSFORM_TYPE', 415);

      const resize: ImageResizeOptions = { fit: transform.fit };
      if (transform.width !== undefined) resize.width = transform.width;
      if (transform.height !== undefined) resize.height = transform.height;
      const transformed = await env.IMAGES.input(source.body)
        .transform(resize)
        .output({ format: `image/${outputFormat}`, quality: transform.quality });
      const imageResponse = transformed.response();
      const ttl = parseCacheTtl(env.CACHE_TTL_SECONDS, parsed.expires);
      const response = new Response(imageResponse.body, imageResponse);
      response.headers.set('Cache-Control', `public, max-age=${ttl}, immutable`);
      response.headers.set('Vary', 'Accept');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-UploadKit-Cache', 'MISS');

      ctx.waitUntil(edgeCache.put(cacheKey, response.clone()));
      logRequest('transformed', parsed.key, outputFormat, startedAt);
      return request.method === 'HEAD' ? headResponse(response) : response;
    } catch (error) {
      const message = error instanceof TransformRequestError ? error.message : 'TRANSFORM_FAILED';
      const status = error instanceof TransformRequestError ? 400 : 500;
      console.error(JSON.stringify({
        event: 'image_transform_error',
        code: message,
        status,
        durationMs: Date.now() - startedAt,
      }));
      return jsonError(message, status);
    }
}

export function parseObjectKey(pathname: string): string | null {
  if (!pathname || pathname === '/') return null;

  let key: string;
  try {
    key = decodeURIComponent(pathname.replace(/^\//, ''));
  } catch {
    return null;
  }

  if (!key || key.includes('\0') || key.includes('..') || key.startsWith('/')) {
    return null;
  }

  return key;
}

const PASSTHROUGH_EXCEPTIONS = new Set(['cdn.uploadkit.dev', 'saas.uploadkit.dev', 'cname.uploadkit.dev']);

/** First-party hostnames in the zone that must never be served by this worker. */
export function shouldPassThrough(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (PASSTHROUGH_EXCEPTIONS.has(host)) return false;
  return host === 'uploadkit.dev' || host.endsWith('.uploadkit.dev');
}

const PROJECT_PREFIX = /^[0-9a-f]{24}\//;
/** Marker object `_acl/{projectId}` written by the API when a project is SIGNED. */
const ACL_PREFIX = '_acl/';

// Images (SVG included, so <img src> keeps working) and PDF are served inline;
// the sandbox CSP below neutralises script when the file is opened directly.
const INLINE_SAFE_TYPES = new Set([
  'application/pdf',
  'video/mp4', 'video/webm', 'audio/mpeg', 'audio/ogg', 'audio/wav',
]);

/** Pure header policy: never inline anything that can execute in the CDN origin. */
export function rawObjectHeaders(storedType: string | undefined, key: string): Headers {
  const headers = new Headers();
  const type = (storedType ?? '').split(';')[0]!.trim().toLowerCase();
  const inline = type.startsWith('image/') || INLINE_SAFE_TYPES.has(type);
  headers.set('Content-Type', inline ? type : 'application/octet-stream');
  if (!inline) {
    const name = (key.split('/').pop() ?? 'download').replace(/[^\w.\-]+/g, '_') || 'download';
    headers.set('Content-Disposition', `attachment; filename="${name}"`);
  }
  headers.set('X-Content-Type-Options', 'nosniff');
  // Browser PDF viewers refuse to render under a sandbox CSP, and PDF script
  // runs inside the viewer, not in the CDN origin, so PDF gets no CSP.
  if (type !== 'application/pdf') {
    headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  }
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  headers.set('Accept-Ranges', 'bytes');
  return headers;
}

const ACL_CACHE_TTL_MS = 60_000;
const aclCache = new Map<string, { signed: boolean; expiresAt: number }>();

export function resetAclCache(): void {
  aclCache.clear();
}

/** Per-isolate 60 s cache of the `_acl/{projectId}` marker lookup. */
async function isProjectSigned(env: Env, projectId: string): Promise<boolean> {
  const now = Date.now();
  const hit = aclCache.get(projectId);
  if (hit && hit.expiresAt > now) return hit.signed;
  const signed = (await env.UPLOADS.head(`${ACL_PREFIX}${projectId}`)) !== null;
  if (aclCache.size > 1_000) aclCache.clear();
  aclCache.set(projectId, { signed, expiresAt: now + ACL_CACHE_TTL_MS });
  return signed;
}

async function serveRawObject(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const key = parseObjectKey(url.pathname);
  // Only objects under a project-id prefix are addressable; this also keeps
  // the `_acl/` marker namespace and any foreign bucket content unreachable.
  if (!key || !PROJECT_PREFIX.test(key)) return jsonError('NOT_FOUND', 404);

  const projectId = key.slice(0, 24);
  const signed = await isProjectSigned(env, projectId);
  let ttl = 3_600;
  if (signed) {
    const exp = Number(url.searchParams.get('exp'));
    const sig = url.searchParams.get('sig') ?? '';
    const now = Math.floor(Date.now() / 1000);
    if (!env.IMAGE_TRANSFORM_SECRET || !Number.isSafeInteger(exp) || exp <= now || !sig) {
      return jsonError('SIGNATURE_REQUIRED', 403);
    }
    const payload = `cdn\n${exp}\n${key}`;
    const valid = await verifySignature(env.IMAGE_TRANSFORM_SECRET, sig, payload)
      || (env.IMAGE_TRANSFORM_SECRET_PREVIOUS
        ? await verifySignature(env.IMAGE_TRANSFORM_SECRET_PREVIOUS, sig, payload)
        : false);
    if (!valid) return jsonError('INVALID_SIGNATURE', 403);
    ttl = Math.min(ttl, exp - now);
  }

  const object = await env.UPLOADS.get(key);
  if (!object?.body) return jsonError('NOT_FOUND', 404);

  const headers = rawObjectHeaders(object.httpMetadata?.contentType, key);
  headers.set('Cache-Control', `${signed ? 'private' : 'public'}, max-age=${ttl}`);

  return new Response(request.method === 'HEAD' ? null : object.body, {
    status: 200,
    headers,
  });
}

class TransformRequestError extends Error {}

export function parseTransformRequest(url: URL) {
  const delivery = url.pathname.startsWith('/t/')
    ? 'signed'
    : url.pathname.startsWith('/p/') ? 'public' : null;
  if (!delivery) throw new TransformRequestError('NOT_FOUND');
  const parts = url.pathname.slice(3).split('/');
  const expiresRaw = delivery === 'signed' ? parts.shift() : undefined;
  const signature = parts.shift();
  const encodedTransform = parts.shift();
  const keyParts = parts;
  const expires = delivery === 'signed' ? Number(expiresRaw) : null;
  if ((delivery === 'signed' && !Number.isSafeInteger(expires))
    || !signature || !encodedTransform || keyParts.length === 0) {
    throw new TransformRequestError('INVALID_TRANSFORM_URL');
  }
  let key: string;
  try {
    key = keyParts.map((part) => decodeURIComponent(part)).join('/');
  } catch {
    throw new TransformRequestError('INVALID_FILE_KEY');
  }
  if (!key || key.includes('\0')) throw new TransformRequestError('INVALID_FILE_KEY');
  return { delivery, expires, signature, encodedTransform, key } as const;
}

export function decodeTransform(encoded: string): ImageTransform {
  let value: unknown;
  try {
    value = /^(?:w|h)_/.test(encoded)
      ? parseReadableTransform(encoded)
      : JSON.parse(new TextDecoder().decode(base64UrlDecode(encoded)));
  } catch {
    throw new TransformRequestError('INVALID_TRANSFORM_OPTIONS');
  }
  if (typeof value !== 'object' || value === null) throw new TransformRequestError('INVALID_TRANSFORM_OPTIONS');
  const v = value as Partial<ImageTransform>;
  const fits = ['scale-down', 'contain', 'cover', 'crop', 'pad'];
  const formats = ['auto', 'avif', 'webp', 'jpeg', 'png'];
  if ((!validDimension(v.width) && v.width !== undefined)
    || (!validDimension(v.height) && v.height !== undefined)
    || (v.width === undefined && v.height === undefined)
    || !fits.includes(String(v.fit))
    || !Number.isInteger(v.quality) || (v.quality ?? 0) < 1 || (v.quality ?? 0) > 100
    || !formats.includes(String(v.format))) {
    throw new TransformRequestError('INVALID_TRANSFORM_OPTIONS');
  }
  return v as ImageTransform;
}

function parseReadableTransform(recipe: string): Partial<ImageTransform> {
  if (recipe.length > 256) throw new TransformRequestError('INVALID_TRANSFORM_OPTIONS');
  const value: Partial<ImageTransform> = {};
  const seen = new Set<string>();
  for (const component of recipe.split(',')) {
    const separator = component.indexOf('_');
    if (separator <= 0) throw new TransformRequestError('INVALID_TRANSFORM_OPTIONS');
    const name = component.slice(0, separator);
    const raw = component.slice(separator + 1);
    if (!raw || seen.has(name)) throw new TransformRequestError('INVALID_TRANSFORM_OPTIONS');
    seen.add(name);
    if (name === 'w' || name === 'h' || name === 'q') {
      if (!/^\d+$/.test(raw)) throw new TransformRequestError('INVALID_TRANSFORM_OPTIONS');
      const number = Number(raw);
      if (name === 'w') value.width = number;
      else if (name === 'h') value.height = number;
      else value.quality = number;
    } else if (name === 'fit') {
      value.fit = raw as ImageTransform['fit'];
    } else if (name === 'f') {
      value.format = raw as ImageTransform['format'];
    } else {
      throw new TransformRequestError('INVALID_TRANSFORM_OPTIONS');
    }
  }
  return value;
}

function validDimension(value: number | undefined): boolean {
  return Number.isInteger(value) && (value ?? 0) >= 1 && (value ?? 0) <= 4096;
}

export function negotiateFormat(format: ImageTransform['format'], accept: string | null): Exclude<ImageTransform['format'], 'auto'> {
  if (format !== 'auto') return format;
  const accepted = parseAccept(accept);
  const avif = accepted.get('image/avif') ?? 0;
  const webp = accepted.get('image/webp') ?? 0;
  if (avif > 0 && avif >= webp) return 'avif';
  if (webp > 0) return 'webp';
  return 'jpeg';
}

function parseAccept(header: string | null): Map<string, number> {
  const values = new Map<string, number>();
  for (const entry of (header ?? '').split(',')) {
    const [mediaTypeRaw, ...parameters] = entry.trim().toLowerCase().split(';');
    if (!mediaTypeRaw) continue;
    const qualityParameter = parameters.find((part) => part.trim().startsWith('q='));
    const quality = qualityParameter ? Number.parseFloat(qualityParameter.trim().slice(2)) : 1;
    values.set(mediaTypeRaw, Number.isFinite(quality) ? Math.min(1, Math.max(0, quality)) : 0);
  }
  return values;
}

export async function verifySignature(secret: string, provided: string, payload: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
  let actual: Uint8Array;
  try {
    actual = base64UrlDecode(provided);
  } catch {
    return false;
  }
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected[i]! ^ actual[i]!;
  return difference === 0;
}

function signingPayload(expires: number, encodedTransform: string, key: string): string {
  return `${expires}\n${encodedTransform}\n${key}`;
}

function publicSigningPayload(encodedTransform: string, key: string): string {
  return `public\n${encodedTransform}\n${key}`;
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function parseCacheTtl(raw: string | undefined, expires: number | null): number {
  const configured = Number.parseInt(raw ?? '3600', 10);
  const remaining = expires === null
    ? Number.POSITIVE_INFINITY
    : Math.max(0, expires - Math.floor(Date.now() / 1000));
  return Math.min(Number.isFinite(configured) ? Math.max(60, configured) : 3_600, remaining);
}

function withOperationalHeaders(response: Response, cacheStatus: 'HIT' | 'MISS'): Response {
  const copy = new Response(response.body, response);
  copy.headers.set('X-UploadKit-Cache', cacheStatus);
  return copy;
}

function logRequest(event: 'cache_hit' | 'transformed', key: string, format: string, startedAt: number): void {
  console.log(JSON.stringify({
    event: `image_transform_${event}`,
    keyHash: keyHash(key),
    format,
    durationMs: Date.now() - startedAt,
  }));
}

function keyHash(key: string): string {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function headResponse(response: Response): Response {
  return new Response(null, { status: response.status, headers: response.headers });
}

function jsonError(code: string, status: number, headers?: Record<string, string>): Response {
  return Response.json(
    { error: { code } },
    { status, ...(headers ? { headers } : {}) },
  );
}
