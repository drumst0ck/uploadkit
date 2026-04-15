import { describe, it, expect } from 'vitest';
import { parseArgs } from '../args.js';

describe('parseArgs', () => {
  it('parses a subcommand with a boolean flag', () => {
    const parsed = parseArgs(['init', '--yes']);
    expect(parsed.command).toBe('init');
    expect(parsed.positional).toEqual([]);
    expect(parsed.flags.yes).toBe(true);
  });

  it('captures a positional argument after the subcommand', () => {
    const parsed = parseArgs(['add', 'dropzone']);
    expect(parsed.command).toBe('add');
    expect(parsed.positional).toEqual(['dropzone']);
  });

  it('treats --version (no command) as a global flag', () => {
    const parsed = parseArgs(['--version']);
    expect(parsed.command).toBeUndefined();
    expect(parsed.flags.version).toBe(true);
  });

  it('supports short aliases -v / -h / -y', () => {
    expect(parseArgs(['-v']).flags.version).toBe(true);
    expect(parseArgs(['-h']).flags.help).toBe(true);
    expect(parseArgs(['init', '-y']).flags.yes).toBe(true);
  });

  it('captures --target for `add`', () => {
    const parsed = parseArgs(['add', 'dropzone', '--target', 'app/page.tsx']);
    expect(parsed.command).toBe('add');
    expect(parsed.positional).toEqual(['dropzone']);
    expect(parsed.flags.target).toBe('app/page.tsx');
  });

  it('captures --timestamp for `restore`', () => {
    const parsed = parseArgs(['restore', '--timestamp', '2026-04-15T00:00:00Z']);
    expect(parsed.command).toBe('restore');
    expect(parsed.flags.timestamp).toBe('2026-04-15T00:00:00Z');
  });

  it('captures --skip-install', () => {
    const parsed = parseArgs(['init', '--skip-install']);
    expect(parsed.flags.skipInstall).toBe(true);
  });

  it('defaults all booleans to false when not passed', () => {
    const parsed = parseArgs(['init']);
    expect(parsed.flags.yes).toBe(false);
    expect(parsed.flags.version).toBe(false);
    expect(parsed.flags.help).toBe(false);
    expect(parsed.flags.skipInstall).toBe(false);
    expect(parsed.flags.target).toBeUndefined();
    expect(parsed.flags.timestamp).toBeUndefined();
  });
});
