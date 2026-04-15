import { describe, it, expect } from 'vitest';
import { parseArgs } from '../args.js';

describe('parseArgs', () => {
  it('parses positional project name and recognized flags', () => {
    const parsed = parseArgs(['my-app', '--template', 'next', '--pm', 'bun', '--yes']);
    expect(parsed.positional).toBe('my-app');
    expect(parsed.template).toBe('next');
    expect(parsed.pm).toBe('bun');
    expect(parsed.yes).toBe(true);
    expect(parsed.install).toBe(true);
    expect(parsed.ts).toBeUndefined();
    expect(parsed.errors).toEqual([]);
  });

  it('handles short aliases (-t, -y, -h, -v)', () => {
    const parsed = parseArgs(['-t', 'vite', '-y']);
    expect(parsed.template).toBe('vite');
    expect(parsed.yes).toBe(true);
  });

  it('--no-install sets install: false', () => {
    const parsed = parseArgs(['--no-install']);
    expect(parsed.install).toBe(false);
  });

  it('--no-git sets git: false', () => {
    const parsed = parseArgs(['--no-git']);
    expect(parsed.git).toBe(false);
  });

  it('defaults install and git to true', () => {
    const parsed = parseArgs([]);
    expect(parsed.install).toBe(true);
    expect(parsed.git).toBe(true);
  });

  it('-h sets help flag', () => {
    expect(parseArgs(['-h']).help).toBe(true);
    expect(parseArgs(['--help']).help).toBe(true);
  });

  it('-v sets version flag', () => {
    expect(parseArgs(['-v']).version).toBe(true);
    expect(parseArgs(['--version']).version).toBe(true);
  });

  it('--ts and --no-ts toggle typescript explicitly', () => {
    expect(parseArgs(['--ts']).ts).toBe(true);
    expect(parseArgs(['--no-ts']).ts).toBe(false);
    expect(parseArgs([]).ts).toBeUndefined();
  });

  it('invalid --template is reported via errors, not thrown', () => {
    const parsed = parseArgs(['--template', 'foo']);
    expect(parsed.template).toBeUndefined();
    expect(parsed.errors.length).toBeGreaterThan(0);
    expect(parsed.errors[0]).toMatch(/template/i);
  });

  it('invalid --pm is reported via errors', () => {
    const parsed = parseArgs(['--pm', 'cargo']);
    expect(parsed.pm).toBeUndefined();
    expect(parsed.errors.length).toBeGreaterThan(0);
    expect(parsed.errors[0]).toMatch(/pm|package manager/i);
  });

  it('accepts --force', () => {
    expect(parseArgs(['--force']).force).toBe(true);
    expect(parseArgs([]).force).toBe(false);
  });

  it('keeps only the first positional as the project name', () => {
    const parsed = parseArgs(['my-app', 'extra']);
    expect(parsed.positional).toBe('my-app');
  });
});
