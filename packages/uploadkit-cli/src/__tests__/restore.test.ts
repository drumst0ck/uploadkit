import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
