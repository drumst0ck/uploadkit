import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadKitError } from '@uploadkitdev/shared';
vi.mock('../src/http', () => ({ fetchApi: vi.fn() }));
import { fetchApi } from '../src/http';
import { multipartUpload } from '../src/multipart';
import { singleUpload } from '../src/single';
import { ProxyUploadKitClient } from '../src/proxy-client';

const api = vi.mocked(fetchApi);
const config = { apiKey: 'test', maxRetries: 1 };
const file = new File(['x'], 'file.bin', { type: 'application/octet-stream' });
const result = { id: 'file', key: 'key', url: 'https://cdn.test/key' };
let instances: Xhr[];
let send: (xhr: Xhr, index: number) => void;
class Xhr {
  status = 200;
  upload = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  open() {}
  setRequestHeader() {}
  getResponseHeader() { return 'etag'; }
  send() { instances.push(this); send(this, instances.length); }
  abort = vi.fn(() => this.onabort?.());
  load(status: number) { this.status = status; this.onload?.(); }
}
const init = (count = 1) => ({ fileId: 'file', uploadId: 'upload', parts: Array.from({ length: count }, (_, i) => ({ partNumber: i + 1, uploadUrl: `https://storage.test/${i}` })) });
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); instances = [];
  send = xhr => { queueMicrotask(() => xhr.load(200)); };
  vi.stubGlobal('XMLHttpRequest', Xhr);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('multipart lifecycle audit', () => {
  it.each([429, 503])('retries a transient %s part response', async status => {
    api.mockResolvedValueOnce(init()).mockResolvedValueOnce({ file: result });
    send = (xhr, index) => { queueMicrotask(() => xhr.load(index === 1 ? status : 200)); };
    const pending = multipartUpload(config, { file, route: 'media' }).then(value => ({ value }), error => ({ error }));
    await vi.runAllTimersAsync();
    expect(await pending).toEqual({ value: result });
    expect(instances).toHaveLength(2);
  });

  it('aborts active peers before asking storage to abort the multipart upload', async () => {
    api.mockImplementation(async (_base, _key, path) => {
      if (path.endsWith('/init')) return init(3) as never;
      expect(instances[1]!.abort).toHaveBeenCalledOnce();
      expect(instances[2]!.abort).toHaveBeenCalledOnce();
      return {} as never;
    });
    send = (xhr, index) => { if (index === 1) queueMicrotask(() => xhr.load(403)); };
    const pending = multipartUpload(config, { file, route: 'media' }).catch(error => error);
    await vi.runAllTimersAsync();
    expect(await pending).toMatchObject({ code: 'PART_UPLOAD_FAILED', statusCode: 403 });
    expect(instances[1]!.abort).toHaveBeenCalledOnce();
    expect(instances[2]!.abort).toHaveBeenCalledOnce();
    expect(api).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), expect.stringContaining('/abort'), expect.anything());
  });

  it('does not abort after an ambiguous complete response followed by a failed retry', async () => {
    api.mockResolvedValueOnce(init())
      .mockRejectedValueOnce(new UploadKitError('NETWORK_RESPONSE_LOST', 'response lost after server committed', 503))
      .mockRejectedValueOnce(new UploadKitError('ALREADY_COMPLETED', 'already complete', 409))
      .mockResolvedValue({});
    const pending = multipartUpload(config, { file, route: 'media' }).catch(error => error);
    await vi.runAllTimersAsync();
    expect(await pending).toMatchObject({ code: 'ALREADY_COMPLETED' });
    expect(api.mock.calls.some(call => call[2].endsWith('/abort'))).toBe(false);
  });
});

it.each(['single', 'multipart', 'proxy'] as const)('removes settled %s XHR abort listeners', async mode => {
  const controller = new AbortController();
  const remove = vi.spyOn(controller.signal, 'removeEventListener');
  if (mode === 'multipart') api.mockResolvedValueOnce(init()).mockResolvedValueOnce({ file: result });
  else api.mockResolvedValueOnce({ uploadUrl: 'https://storage.test', fileId: 'file' }).mockResolvedValueOnce({ file: result });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ uploadUrl: 'https://storage.test', fileId: 'file', key: 'key' })).mockResolvedValueOnce(Response.json({ file: result })));
  const pending = mode === 'multipart' ? multipartUpload(config, { file, route: 'media', signal: controller.signal })
    : mode === 'single' ? singleUpload(config, { file, route: 'media', signal: controller.signal })
      : new ProxyUploadKitClient({ endpoint: '/api/uploadkit' }).upload({ file, route: 'media', signal: controller.signal });
  await vi.runAllTimersAsync();
  await pending;
  expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  controller.abort();
  expect(instances[0]!.abort).not.toHaveBeenCalled();
});
