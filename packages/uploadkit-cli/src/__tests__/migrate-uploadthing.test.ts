import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../commands/migrate-uploadthing.js';
import { parseArgs } from '../args.js';

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'uploadkit-uploadthing-'));
  vi.spyOn(process, 'cwd').mockReturnValue(root);
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});
afterEach(() => {
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

describe('migrate-uploadthing', () => {
  it('generates a router using the supported FileRouter contract', async () => {
    expect(await run(parseArgs(['migrate-uploadthing']))).toBe(0);
    const output = readFileSync(join(root, 'lib/uploadkit.ts'), 'utf8');
    expect(output).not.toContain('createFileRouter');
    expect(output).toContain('type FileRouter');
    expect(output).toContain('satisfies FileRouter');
  });

  it('refuses to overwrite user code, even with --yes', async () => {
    mkdirSync(join(root, 'lib'));
    const target = join(root, 'lib/uploadkit.ts');
    writeFileSync(target, '// my customized router');
    expect(await run(parseArgs(['migrate-uploadthing', '--yes']))).toBe(1);
    expect(readFileSync(target, 'utf8')).toBe('// my customized router');
    expect(process.stderr.write).toHaveBeenCalledWith(expect.stringContaining('already exists'));
  });
});
