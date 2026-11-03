import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  mkdirSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readManifests } from '../backup/restore-manifest.js';
import type { BackupManifest } from '../backup/types.js';
import { createBackupSession } from '../backup/backup.js';
import { applyRestore } from '../restore/apply.js';

// Mock @clack/prompts — the default auto-confirms drift prompts so we can
// assert drift behavior explicitly and keep tests non-interactive.
vi.mock('@clack/prompts', () => ({
  confirm: vi.fn(async () => true),
  isCancel: (_: unknown) => false,
  select: vi.fn(),
  text: vi.fn(),
}));

describe('applyRestore', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'uploadkit-restore-'));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  async function seedSession(): Promise<{
    manifest: Awaited<ReturnType<ReturnType<typeof createBackupSession>['finalize']>>;
    modifiedPath: string;
    createdPath: string;
  }> {
    // File that will be "modified" by the CLI (exists before init)
    const modifiedPath = join(root, 'app', 'layout.tsx');
    mkdirSync(join(root, 'app'), { recursive: true });
    writeFileSync(modifiedPath, 'ORIGINAL_CONTENT\n', 'utf8');

    // File that the CLI will "create" (does not exist yet at backup time)
    const createdPath = join(root, 'app', 'api', 'uploadkit', 'route.ts');

    const session = createBackupSession(root, {
      timestamp: '2026-04-15T12-00-00Z',
    });
    // 1. backup the pre-existing file (action=modify)
    await session.save(modifiedPath);
    // 2. record the file about to be created (action=create)
    session.recordCreate(createdPath);
    const manifest = await session.finalize();

    // Simulate the init making its changes:
    writeFileSync(modifiedPath, 'MODIFIED_BY_CLI\n', 'utf8');
    mkdirSync(join(root, 'app', 'api', 'uploadkit'), { recursive: true });
    writeFileSync(createdPath, 'export async function GET() {}', 'utf8');

    return { manifest, modifiedPath, createdPath };
  }

  it.each(['../sentinel.txt', '..\\sentinel.txt'])(
    'rejects unsafe target %s before changing any file', async (relativePath) => {
      const project = join(root, 'project');
      mkdirSync(project);
      writeFileSync(join(root, 'sentinel.txt'), 'outside');
      writeFileSync(join(project, 'keep.txt'), 'inside');
      const manifest: BackupManifest = {
        root: project, timestamp: 'session',
        entries: [
          { action: 'create', relativePath },
          { action: 'create', relativePath: 'keep.txt' },
        ],
      };
      await expect(applyRestore(manifest, { yes: true })).rejects.toThrow(/unsafe|outside|path/i);
      expect(readFileSync(join(root, 'sentinel.txt'), 'utf8')).toBe('outside');
      expect(readFileSync(join(project, 'keep.txt'), 'utf8')).toBe('inside');
    },
  );

  it.each(['target', 'backup', 'dangling'] as const)('rejects %s symlink escapes', async (kind) => {
    const project = join(root, 'project');
    const session = join(project, '.uploadkit-backup', 'session');
    const outside = join(root, 'outside');
    mkdirSync(session, { recursive: true });
    mkdirSync(outside);
    writeFileSync(join(outside, 'file.txt'), 'outside');
    if (kind === 'backup') {
      symlinkSync(outside, join(session, 'link'));
    } else {
      symlinkSync(kind === 'dangling' ? join(outside, 'missing') : outside, join(project, 'link'));
    }
    const manifest: BackupManifest = {
      root: project, timestamp: 'session', entries: [kind === 'backup'
        ? { action: 'modify', relativePath: 'target.txt', backupPath: 'link/file.txt' }
        : { action: 'create', relativePath: 'link/file.txt' }],
    };
    await expect(applyRestore(manifest, { yes: true })).rejects.toThrow(/outside|unsafe/i);
    expect(readFileSync(join(outside, 'file.txt'), 'utf8')).toBe('outside');
  });

  it.each(['absolute', 'windows', 'empty'] as const)('rejects %s target paths', async (kind) => {
    const manifest: BackupManifest = {
      root, timestamp: 'session', entries: [{ action: 'create', relativePath:
        kind === 'absolute' ? join(root, 'file.txt') : kind === 'windows' ? 'C:\\outside\\file.txt' : '' }],
    };
    await expect(applyRestore(manifest, { yes: true })).rejects.toThrow(/path/i);
  });

  it('rejects backup paths outside the session', async () => {
    writeFileSync(join(root, 'secret.txt'), 'outside backup');
    const manifest: BackupManifest = {
      root, timestamp: 'session', entries: [
        { action: 'modify', relativePath: 'target.txt', backupPath: '../../secret.txt' },
      ],
    };
    await expect(applyRestore(manifest, { yes: true })).rejects.toThrow(/unsafe|outside|path/i);
  });

  it('ignores manifests that redirect root or session outside the selected project', async () => {
    for (const [folder, overrides] of [
      ['fake-root', { root: join(root, 'elsewhere') }],
      ['fake-session', { timestamp: '../../elsewhere' }],
    ] as const) {
      const session = join(root, '.uploadkit-backup', folder);
      mkdirSync(session, { recursive: true });
      writeFileSync(join(session, 'manifest.json'), JSON.stringify({
        root, timestamp: folder, entries: [], ...overrides,
      }));
    }
    expect(await readManifests(root)).toEqual([]);
  });

  it('restores a modified file and deletes a created file', async () => {
    const { manifest, modifiedPath, createdPath } = await seedSession();

    const result = await applyRestore(manifest, { yes: true });

    expect(readFileSync(modifiedPath, 'utf8')).toBe('ORIGINAL_CONTENT\n');
    expect(existsSync(createdPath)).toBe(false);
    expect(result.restored).toContain(modifiedPath);
    expect(result.deleted).toContain(createdPath);
    expect(result.skipped).toHaveLength(0);
  });

  it('is idempotent — a second applyRestore is a no-op', async () => {
    const { manifest, modifiedPath, createdPath } = await seedSession();

    await applyRestore(manifest, { yes: true });
    const second = await applyRestore(manifest, { yes: true });

    // File still at original content, created file still absent.
    expect(readFileSync(modifiedPath, 'utf8')).toBe('ORIGINAL_CONTENT\n');
    expect(existsSync(createdPath)).toBe(false);

    // The modify entry should now be skipped (current == backup).
    expect(second.restored).toHaveLength(0);
    expect(second.skipped).toContain(modifiedPath);
    // The create entry is still "deleted" because rm -f on missing succeeds.
    expect(second.deleted).toContain(createdPath);
  });

  it('--yes bypasses the drift prompt and overwrites user-modified files', async () => {
    const clack = await import('@clack/prompts');
    const { manifest, modifiedPath } = await seedSession();

    // User hand-edits the modified file AFTER init ran, so current !=
    // backup and current != CLI-written content. Drift!
    writeFileSync(modifiedPath, 'USER_EDITS_AFTER_INIT\n', 'utf8');

    const result = await applyRestore(manifest, { yes: true });

    expect(readFileSync(modifiedPath, 'utf8')).toBe('ORIGINAL_CONTENT\n');
    expect(result.restored).toContain(modifiedPath);
    // The prompt should NOT have been invoked in --yes mode.
    expect(clack.confirm).not.toHaveBeenCalled();
  });

  it('restores retained preflight bytes instead of reopening backups after prompts', async () => {
    const clack = await import('@clack/prompts');
    const { manifest, modifiedPath } = await seedSession();
    const entry = manifest.entries.find((entry) => entry.action === 'modify')!;
    const backupPath = join(root, '.uploadkit-backup', manifest.timestamp, entry.backupPath!);
    vi.mocked(clack.confirm).mockImplementationOnce(async () => {
      writeFileSync(backupPath, 'CHANGED_AFTER_PREFLIGHT\n');
      return true;
    });
    await applyRestore(manifest);
    expect(readFileSync(modifiedPath, 'utf8')).toBe('ORIGINAL_CONTENT\n');
    expect(readFileSync(backupPath, 'utf8')).toBe('CHANGED_AFTER_PREFLIGHT\n');
  });

  it('prompts on drift when --yes is NOT set and skips when the user declines', async () => {
    const clack = await import('@clack/prompts');
    (clack.confirm as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      false,
    );
    const { manifest, modifiedPath } = await seedSession();

    writeFileSync(modifiedPath, 'USER_EDITS_AFTER_INIT\n', 'utf8');

    const result = await applyRestore(manifest, { yes: false });

    expect(clack.confirm).toHaveBeenCalledOnce();
    // User said no → file left alone, recorded as skipped.
    expect(readFileSync(modifiedPath, 'utf8')).toBe('USER_EDITS_AFTER_INIT\n');
    expect(result.skipped).toContain(modifiedPath);
    expect(result.restored).not.toContain(modifiedPath);
  });

  it('throws a clear error when the backup directory was deleted', async () => {
    const { manifest } = await seedSession();

    // Nuke the backup dir but keep the in-memory manifest reference.
    rmSync(join(root, '.uploadkit-backup'), { recursive: true, force: true });

    await expect(applyRestore(manifest, { yes: true })).rejects.toThrow(
      /Backup file is missing/,
    );
  });

  it('reverses entries — deletes created files before restoring modifies', async () => {
    // Seed a manifest where a modify entry comes BEFORE a create entry.
    // Reverse iteration should touch the create first.
    const modifiedPath = join(root, 'a.txt');
    writeFileSync(modifiedPath, 'A_ORIG\n', 'utf8');
    const createdPath = join(root, 'b.txt');

    const session = createBackupSession(root, {
      timestamp: '2026-04-15T13-00-00Z',
    });
    await session.save(modifiedPath);
    session.recordCreate(createdPath);
    const manifest = await session.finalize();

    // Apply the "CLI mutations"
    writeFileSync(modifiedPath, 'A_NEW\n', 'utf8');
    writeFileSync(createdPath, 'B_CREATED\n', 'utf8');

    const result = await applyRestore(manifest, { yes: true });

    expect(readFileSync(modifiedPath, 'utf8')).toBe('A_ORIG\n');
    expect(existsSync(createdPath)).toBe(false);
    // The order of result arrays reflects reverse iteration: delete first.
    expect(result.deleted[0]).toBe(createdPath);
    expect(result.restored[0]).toBe(modifiedPath);
  });
});
