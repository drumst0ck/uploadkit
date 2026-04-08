import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry } from '../src/retry';
import { UploadKitError } from '@uploadkit/shared';

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns result on success without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn, { maxRetries: 3 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on 5xx status codes up to maxRetries times', async () => {
    const error = new UploadKitError('SERVER_ERROR', 'Internal Server Error', 500);
    const fn = vi.fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');

    const promise = withRetry(fn, { maxRetries: 3 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('retries on 429 status codes', async () => {
    const error = new UploadKitError('RATE_LIMITED', 'Rate limit exceeded', 429);
    const fn = vi.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('ok');

    const promise = withRetry(fn, { maxRetries: 3 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on 4xx errors (400, 401, 403)', async () => {
    const error400 = new UploadKitError('BAD_REQUEST', 'Bad Request', 400);
    const fn400 = vi.fn().mockRejectedValue(error400);

    await expect(withRetry(fn400, { maxRetries: 3 })).rejects.toThrow('Bad Request');
    expect(fn400).toHaveBeenCalledTimes(1);

    const error401 = new UploadKitError('UNAUTHORIZED', 'Unauthorized', 401);
    const fn401 = vi.fn().mockRejectedValue(error401);

    await expect(withRetry(fn401, { maxRetries: 3 })).rejects.toThrow('Unauthorized');
    expect(fn401).toHaveBeenCalledTimes(1);

    const error403 = new UploadKitError('FORBIDDEN', 'Forbidden', 403);
    const fn403 = vi.fn().mockRejectedValue(error403);

    await expect(withRetry(fn403, { maxRetries: 3 })).rejects.toThrow('Forbidden');
    expect(fn403).toHaveBeenCalledTimes(1);
  });

  it('respects AbortSignal and throws immediately on abort', async () => {
    const controller = new AbortController();
    const fn = vi.fn().mockResolvedValue('never');

    // Abort before calling withRetry
    controller.abort();

    await expect(
      withRetry(fn, { maxRetries: 3, signal: controller.signal })
    ).rejects.toMatchObject({ code: 'UPLOAD_ABORTED' });

    // fn should never be called — abort is detected before the first attempt
    expect(fn).toHaveBeenCalledTimes(0);
  });

  it('uses exponential backoff (delay doubles per attempt)', async () => {
    const error = new UploadKitError('SERVER_ERROR', 'Internal Server Error', 500);
    const fn = vi.fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('done');

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const promise = withRetry(fn, { maxRetries: 3 });
    await vi.runAllTimersAsync();
    await promise;

    // Get the delay values used (excluding any non-retry timeouts)
    const retryDelays = setTimeoutSpy.mock.calls
      .map(([, delay]) => delay as number)
      .filter((d) => d > 0);

    // Each delay should be >= the previous (exponential growth)
    expect(retryDelays.length).toBeGreaterThanOrEqual(3);
    expect(retryDelays[1]).toBeGreaterThanOrEqual(retryDelays[0]!);
    expect(retryDelays[2]).toBeGreaterThanOrEqual(retryDelays[1]!);
  });

  it('throws after exhausting all retries', async () => {
    // Use real timers for this test to avoid vitest fake-timer/unhandled-rejection interaction
    vi.useRealTimers();

    // Mock setTimeout to resolve immediately so test runs fast
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn) => {
      (fn as () => void)();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    const error = new UploadKitError('SERVER_ERROR', 'Internal Server Error', 500);
    const fn = vi.fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('never-reached');

    await expect(withRetry(fn, { maxRetries: 2 })).rejects.toMatchObject({
      code: 'SERVER_ERROR',
    });

    // initial attempt + 2 retries = 3 calls
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
