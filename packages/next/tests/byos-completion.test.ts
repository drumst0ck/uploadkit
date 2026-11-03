import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createUploadKitHandler } from '../src/handler';
const storageMocks = vi.hoisted(() => ({ head: vi.fn(), sign: vi.fn() }));
vi.mock('@aws-sdk/client-s3', () => {
  class Command { constructor(public input: Record<string, unknown>) {} }
  return { S3Client: class { send = storageMocks.head; }, PutObjectCommand: Command, HeadObjectCommand: Command, GetObjectCommand: Command };
});
vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: storageMocks.sign }));
const storage = { region: 'auto', endpoint: 'https://storage.test', bucket: 'bucket', accessKeyId: 'test', secretAccessKey: 'test-secret' };
const ctx = (slug = 'media') => ({ params: Promise.resolve({ uploadkit: [slug] }) });
const req = (body: unknown) => new Request('https://app.test/media', { method: 'POST', body: JSON.stringify(body) });
const requestBody = { action: 'request-upload', fileName: 'photo.png', contentType: 'image/png', contentLength: 3 };
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T00:00:00Z')); vi.clearAllMocks();
  storageMocks.head.mockResolvedValue({ ContentLength: 3, ContentType: 'image/png', LastModified: new Date() });
  storageMocks.sign.mockImplementation(async (_client, command) => `https://storage.test/bucket/${command.input.Key}?server-signed=1`);
});
afterEach(() => vi.useRealTimers());
function setup() {
  const callback = vi.fn().mockResolvedValue({ saved: true });
  const middleware = vi.fn().mockResolvedValue({ userId: 'user' });
  const handler = createUploadKitHandler({ router: { media: { middleware, onUploadComplete: callback }, other: { onUploadComplete: callback } }, storage });
  return { handler, callback, middleware };
}
async function initiate(handler: ReturnType<typeof setup>['handler']) {
  const res = await handler.POST(req(requestBody), ctx());
  expect(res.status).toBe(200);
  return res.json() as Promise<{ key: string; uploadToken: string }>;
}

describe('BYOS completion grant', () => {
  it('requires an initiation grant before invoking a callback or storage', async () => {
    const { handler, callback } = setup();
    const res = await handler.POST(req({ action: 'upload-complete', file: { key: 'other/file', url: 'https://attacker.test' } }), ctx());
    expect(res.status).toBe(400);
    expect(callback).not.toHaveBeenCalled();
    expect(storageMocks.head).not.toHaveBeenCalled();
  });
  it('returns an expiring grant and constructs the completion file from HEAD plus its own signed URL', async () => {
    const { handler, callback, middleware } = setup();
    const { key, uploadToken } = await initiate(handler);
    expect(uploadToken).toEqual(expect.any(String));
    const res = await handler.POST(req({ action: 'upload-complete', key, uploadToken, file: { key: 'forged', url: 'https://attacker.test', size: 999, type: 'text/html' } }), ctx());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(storageMocks.head).toHaveBeenCalledWith(expect.objectContaining({ input: { Bucket: 'bucket', Key: key } }));
    expect(data.file).toMatchObject({ key, name: 'photo.png', size: 3, type: 'image/png', url: `https://storage.test/bucket/${key}?server-signed=1`, status: 'uploaded' });
    expect(callback).toHaveBeenCalledWith({ file: data.file, metadata: { userId: 'user' } });
    expect(middleware).toHaveBeenCalledTimes(2);
  });
  it.each(['forged', 'expired', 'key', 'route', 'bucket', 'size', 'type', 'missing-object', 'missing-object-403'])('rejects %s completion without callback', async mode => {
    const { handler, callback } = setup();
    let { key, uploadToken } = await initiate(handler);
    const complete = { action: 'upload-complete', key, uploadToken };
    if (mode === 'forged') complete.uploadToken = `${uploadToken.slice(0, -4)}AAAA`;
    if (mode === 'expired') vi.advanceTimersByTime(901_000);
    if (mode === 'key') complete.key = 'media/another/file';
    if (mode === 'size') storageMocks.head.mockResolvedValue({ ContentLength: 4, ContentType: 'image/png' });
    if (mode === 'type') storageMocks.head.mockResolvedValue({ ContentLength: 3, ContentType: 'text/html' });
    if (mode === 'missing-object') storageMocks.head.mockRejectedValue(Object.assign(new Error('internal storage hostname'), { $metadata: { httpStatusCode: 404 } }));
    if (mode === 'missing-object-403') storageMocks.head.mockRejectedValue(Object.assign(new Error('AccessDenied'), { $metadata: { httpStatusCode: 403 } }));
    const target = mode === 'bucket' ? createUploadKitHandler({ router: { media: { onUploadComplete: callback } }, storage: { ...storage, bucket: 'other' } }) : handler;
    const res = await target.POST(req(complete), ctx(mode === 'route' ? 'other' : 'media'));
    expect(res.status).toBe(400);
    expect(callback).not.toHaveBeenCalled();
    if (['forged', 'expired', 'key', 'route', 'bucket'].includes(mode)) expect(storageMocks.head).not.toHaveBeenCalled();
  });
  it('rejects a modified signed claim payload', async () => {
    const { handler, callback } = setup();
    const { key, uploadToken } = await initiate(handler);
    expect(uploadToken).toEqual(expect.any(String));
    const [payload, signature] = uploadToken.split('.');
    const claims = JSON.parse(Buffer.from(payload!, 'base64url').toString());
    claims.contentLength = 999;
    const tampered = `${Buffer.from(JSON.stringify(claims)).toString('base64url')}.${signature}`;
    expect((await handler.POST(req({ action: 'upload-complete', key, uploadToken: tampered }), ctx())).status).toBe(400);
    expect(callback).not.toHaveBeenCalled();
    expect(storageMocks.head).not.toHaveBeenCalled();
  });
});
