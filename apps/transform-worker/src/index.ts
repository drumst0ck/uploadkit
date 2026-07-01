interface Env {
  UPLOADS: R2Bucket;
  IMAGES: ImagesBinding;
  IMAGE_TRANSFORM_SECRET: string;
  IMAGE_TRANSFORM_SECRET_PREVIOUS?: string;
  CACHE_TTL_SECONDS?: string;
}

interface R2Bucket {
  get(key: string): Promise<{
    body: ReadableStream;
    httpMetadata?: { contentType?: string };
  } | null>;
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

const PREFIX = '/t/';
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const edgeCache = (caches as CacheStorage & { default: Cache }).default;
    const startedAt = Date.now();
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return jsonError('METHOD_NOT_ALLOWED', 405, { Allow: 'GET, HEAD' });
    }

    try {
      const parsed = parseTransformRequest(new URL(request.url));
      if (parsed.expires <= Math.floor(Date.now() / 1000)) {
        return jsonError('TRANSFORM_URL_EXPIRED', 403);
      }
      if (!env.IMAGE_TRANSFORM_SECRET) return jsonError('WORKER_NOT_CONFIGURED', 503);

      const payload = signingPayload(parsed.expires, parsed.encodedTransform, parsed.key);
      const valid = await verifySignature(env.IMAGE_TRANSFORM_SECRET, parsed.signature, payload)
        || (env.IMAGE_TRANSFORM_SECRET_PREVIOUS
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
  },
};

class TransformRequestError extends Error {}

export function parseTransformRequest(url: URL) {
  if (!url.pathname.startsWith(PREFIX)) throw new TransformRequestError('NOT_FOUND');
  const parts = url.pathname.slice(PREFIX.length).split('/');
  const [expiresRaw, signature, encodedTransform, ...keyParts] = parts;
  const expires = Number(expiresRaw);
  if (!Number.isSafeInteger(expires) || !signature || !encodedTransform || keyParts.length === 0) {
    throw new TransformRequestError('INVALID_TRANSFORM_URL');
  }
  let key: string;
  try {
    key = keyParts.map((part) => decodeURIComponent(part)).join('/');
  } catch {
    throw new TransformRequestError('INVALID_FILE_KEY');
  }
  if (!key || key.includes('\0')) throw new TransformRequestError('INVALID_FILE_KEY');
  return { expires, signature, encodedTransform, key };
}

export function decodeTransform(encoded: string): ImageTransform {
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(base64UrlDecode(encoded)));
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

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function parseCacheTtl(raw: string | undefined, expires: number): number {
  const configured = Number.parseInt(raw ?? '3600', 10);
  const remaining = Math.max(0, expires - Math.floor(Date.now() / 1000));
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
