/**
 * Tiny concurrency-bounded worker pool.
 *
 * Why not use `p-limit`? Avoiding a runtime dep for ~30 lines of code keeps
 * the CLI install surface minimal. This pool drains a queue of async units
 * with a fixed concurrency cap and collects results in completion order —
 * callers don't care about input order because every unit appends to a
 * shared store.
 */
export interface PoolOptions {
  concurrency: number;
  signal?: AbortSignal;
}

export async function runPool<T>(
  items: AsyncIterable<T> | Iterable<T>,
  worker: (item: T, signal: AbortSignal) => Promise<void>,
  options: PoolOptions,
): Promise<void> {
  const concurrency = Math.max(1, Math.min(Math.floor(options.concurrency), 1024));
  const source = isAsyncIterable(items) ? items : (async function* () { yield* items; })();
  const queue = source[Symbol.asyncIterator]();
  const signal = options.signal ?? new AbortController().signal;

  // Serialize iterator access. Async generators generally tolerate overlapping
  // next() calls, but custom AsyncIterables are not required to do so.
  let nextTurn = Promise.resolve();
  function next(): Promise<IteratorResult<T>> {
    const result = nextTurn.then(() => queue.next());
    nextTurn = result.then(() => undefined, () => undefined);
    return result;
  }

  async function consume(): Promise<void> {
    while (!signal.aborted) {
      const { value, done } = await next();
      if (done || signal.aborted) return;
      await worker(value, signal);
    }
  }

  // Promise.all guarantees aborts settle after in-flight workers finish and
  // propagates iterator/worker errors instead of leaving an unresolved drain.
  await Promise.all(Array.from({ length: concurrency }, () => consume()));
}

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as AsyncIterable<T>)[Symbol.asyncIterator] === 'function'
  );
}
