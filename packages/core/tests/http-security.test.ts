import { afterEach, expect, it, vi } from 'vitest';
import { fetchApi } from '../src/http';
afterEach(() => vi.unstubAllGlobals());
it.each(['http://localhost.attacker.example', 'http://127.0.0.1.attacker.example', 'http://localhost@attacker.example', 'HTTP://attacker.example'])('never sends credentials to %s', async (url) => {
  const fetch = vi.fn().mockResolvedValue(Response.json({})); vi.stubGlobal('fetch', fetch);
  await expect(fetchApi(url, 'test-key', '/test')).rejects.toMatchObject({ code: 'INSECURE_URL' });
  expect(fetch).not.toHaveBeenCalled();
});
it.each(['http://localhost:3000', 'http://127.0.0.1:8080', 'https://api.uploadkit.dev'])('allows %s', async (url) => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ ok: true })); vi.stubGlobal('fetch', fetch);
  await expect(fetchApi(url, 'test-key', '/test')).resolves.toEqual({ ok: true });
});
