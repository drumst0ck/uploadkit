import { afterEach, describe, expect, it, vi } from 'vitest';

const connect = vi.hoisted(() => vi.fn());
vi.mock('mongoose', () => ({ default: { connect } }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  delete globalThis._mongooseCache;
  connect.mockReset();
});

describe('Mongo connection recovery', () => {
  it('retries after a transient rejection and shares the concurrent attempt', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://localhost/test');
    const error = new Error('transient');
    const connection = { ready: true };
    connect.mockRejectedValueOnce(error).mockResolvedValueOnce(connection);
    const { connectDB } = await import('../src/connection');
    await expect(connectDB()).rejects.toBe(error);
    const results = await Promise.all([connectDB(), connectDB()]);
    expect(results).toEqual([connection, connection]);
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it('explains missing configuration without calling mongoose', async () => {
    vi.stubEnv('MONGODB_URI', '');
    const { connectDB } = await import('../src/connection');
    await expect(connectDB()).rejects.toThrow('MONGODB_URI is required');
    expect(connect).not.toHaveBeenCalled();
  });
});
