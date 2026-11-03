import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const bin = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist/index.js');
const timestamp = '2026-04-15T12-00-00Z';
let sandbox: string;
let root: string;
let session: string;
let outside: string;

// Snapshot the complete sandbox without following symlinks, including archive
// state, backup contents and every file outside the project in these fixtures.
function snapshot(dir: string): unknown {
  return Object.fromEntries(readdirSync(dir).sort().map((name) => {
    const path = join(dir, name);
    const st = lstatSync(path);
    return [name, st.isSymbolicLink() ? { symlink: readlinkSync(path) }
      : st.isDirectory() ? snapshot(path) : readFileSync(path).toString('base64')];
  }));
}

function cli() {
  const env: NodeJS.ProcessEnv = { ...process.env, NO_COLOR: '1' };
  delete env.FORCE_COLOR;
  return spawnSync(process.execPath, [bin, 'restore', '--latest', '--yes'], {
    cwd: root, env, encoding: 'utf8', timeout: 15_000,
  });
}

beforeEach(() => {
  sandbox = realpathSync(mkdtempSync(join(tmpdir(), 'uploadkit-restore-preflight-')));
  root = join(sandbox, 'project');
  session = join(root, '.uploadkit-backup', timestamp);
  outside = join(sandbox, 'outside');
  mkdirSync(session, { recursive: true });
  mkdirSync(outside);
  writeFileSync(join(outside, 'sentinel.txt'), 'outside unchanged');
  writeFileSync(join(root, 'target.txt'), 'current target');
  writeFileSync(join(root, 'created.txt'), 'created target');
  writeFileSync(join(root, 'later.txt'), 'later current');
  writeFileSync(join(session, 'target.bak'), 'original target');
  writeFileSync(join(session, 'manifest.json'), JSON.stringify({
    root, timestamp, entries: [
      { action: 'modify', relativePath: 'target.txt', backupPath: 'target.bak' },
      { action: 'create', relativePath: 'created.txt' },
      { action: 'modify', relativePath: 'later.txt', backupPath: 'target.bak' },
    ],
  }));
});
afterEach(() => rmSync(sandbox, { recursive: true, force: true }));

describe('public CLI restore preflight', () => {
  it.each(['outside', 'dangling'] as const)('rejects an %s archive symlink before restoring', (kind) => {
    symlinkSync(kind === 'outside' ? outside : join(outside, 'missing'), join(root, '.uploadkit-backup/.applied'));
    const before = snapshot(sandbox);
    const result = cli();
    // State assertion comes first so RED demonstrates mutation, not just logging.
    expect(snapshot(sandbox)).toEqual(before);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    const reason = kind === 'outside'
      ? 'Restore path resolves outside its allowed directory' : 'Unsafe dangling restore symlink';
    expect(result.stderr).toBe(`error Unsafe restore archive path: ${reason}\n`);
  });

  it.each(['missing', 'unreadable'] as const)('rejects a %s backup before earlier reverse-plan mutations', (kind) => {
    const backup = join(session, 'target.bak');
    rmSync(backup);
    // A directory is deterministically not a readable backup file, even when
    // tests run with permissions that would bypass chmod-based unreadability.
    if (kind === 'unreadable') mkdirSync(backup);
    // Retain a valid backup for the first reverse-plan overwrite.
    writeFileSync(join(session, 'later.bak'), 'later original');
    const manifestPath = join(session, 'manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.entries[2].backupPath = 'later.bak';
    writeFileSync(manifestPath, JSON.stringify(manifest));
    const before = snapshot(sandbox);
    const result = cli();
    expect(snapshot(sandbox)).toEqual(before);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe(kind === 'missing'
      ? `error Backup file is missing: ${backup}. The .uploadkit-backup/${timestamp}/ directory may have been deleted.\n`
      : `error Backup file is unreadable: ${backup}. Restore aborted before changing files.\n`);
  });

  it('restores and archives a valid session with unchanged success output', () => {
    const result = cli();
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe(`\n✔ Restore complete (${timestamp})\n\n  restored\n    ~ later.txt\n    ~ target.txt\n\n  deleted\n    - created.txt\n`);
    expect(readFileSync(join(root, 'target.txt'), 'utf8')).toBe('original target');
    expect(readFileSync(join(root, 'later.txt'), 'utf8')).toBe('original target');
    expect(readdirSync(join(root, '.uploadkit-backup'))).toEqual(['.applied']);
    expect(readFileSync(join(root, '.uploadkit-backup/.applied', timestamp, 'target.bak'), 'utf8')).toBe('original target');
    expect(readFileSync(join(outside, 'sentinel.txt'), 'utf8')).toBe('outside unchanged');
  });
});
