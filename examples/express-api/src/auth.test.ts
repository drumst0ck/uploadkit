import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { requireAdminToken } from './auth';

async function withServer(token: string | undefined, run: (base: string, deleted: string[]) => Promise<void>) {
  const deleted: string[] = [];
  const app = express();
  app.get('/files', requireAdminToken(token), (_req, res) => res.json({ files: ['a'] }));
  app.delete('/files/{*key}', requireAdminToken(token), (req, res) => {
    deleted.push(String(req.params.key));
    res.json({ ok: true });
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, deleted);
  } finally {
    server.close();
  }
}

test('rejects list and delete without a token and does not delete', async () => {
  await withServer('s3cret-token', async (base, deleted) => {
    assert.equal((await fetch(`${base}/files`)).status, 401);
    assert.equal((await fetch(`${base}/files/x`, { method: 'DELETE' })).status, 401);
    assert.deepEqual(deleted, []);
  });
});

test('rejects a wrong token (same and different length)', async () => {
  await withServer('s3cret-token', async (base, deleted) => {
    for (const bad of ['s3cret-tokeX', 'short']) {
      const res = await fetch(`${base}/files/x`, { method: 'DELETE', headers: { authorization: `Bearer ${bad}` } });
      assert.equal(res.status, 401);
    }
    assert.deepEqual(deleted, []);
  });
});

test('accepts the correct bearer token', async () => {
  await withServer('s3cret-token', async (base, deleted) => {
    const h = { authorization: 'Bearer s3cret-token' };
    assert.equal((await fetch(`${base}/files`, { headers: h })).status, 200);
    assert.equal((await fetch(`${base}/files/k`, { method: 'DELETE', headers: h })).status, 200);
    assert.deepEqual(deleted, ['k']);
  });
});

test('fails closed when no admin token is configured', async () => {
  await withServer(undefined, async (base) => {
    assert.equal((await fetch(`${base}/files`, { headers: { authorization: 'Bearer ' } })).status, 401);
    assert.equal((await fetch(`${base}/files`)).status, 401);
  });
});
