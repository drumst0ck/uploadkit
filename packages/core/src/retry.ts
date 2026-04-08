import { UploadKitError } from '@uploadkit/shared';

interface RetryOptions {
  maxRetries?: number;
  signal?: AbortSignal;
}

/**
 * Wraps an async function with exponential backoff retry logic.
 * Only retries on 5xx status codes and 429 (rate limit).
 * Never retries on 4xx (client errors) — those are permanent failures.
 *
 * Security (T-04-04): maxRetries capped at default 3. Exponential backoff
 * with jitter prevents thundering herd. AbortController allows cancellation.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 3, signal } = opts;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check abort before each attempt (including the first)
    if (signal?.aborted) {
      throw new UploadKitError('UPLOAD_ABORTED', 'Upload was aborted', 0);
    }

    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Determine if we should retry
      const shouldRetry = isRetryable(err);
      const hasAttemptsLeft = attempt < maxRetries;

      if (!shouldRetry || !hasAttemptsLeft) {
        throw err;
      }

      // Check abort before sleeping
      if (signal?.aborted) {
        throw new UploadKitError('UPLOAD_ABORTED', 'Upload was aborted', 0);
      }

      // Exponential backoff with jitter: min(1000 * 2^attempt + random, 30000)
      const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 200, 30000);
      await sleep(delay);
    }
  }

  throw lastError;
}

function isRetryable(err: unknown): boolean {
  if (err instanceof UploadKitError) {
    return err.statusCode >= 500 || err.statusCode === 429;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
