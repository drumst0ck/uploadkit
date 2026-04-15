import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dispatch, handlers } from '../commands/index.js';
import { parseArgs } from '../args.js';

describe('dispatch', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it('routes "init" to the init handler and returns its exit code', async () => {
    const spy = vi.spyOn(handlers, 'init').mockResolvedValue(0);
    const code = await dispatch(parseArgs(['init']));
    expect(spy).toHaveBeenCalledOnce();
    expect(code).toBe(0);
    spy.mockRestore();
  });

  it('routes "add" to the add handler', async () => {
    const spy = vi.spyOn(handlers, 'add').mockResolvedValue(0);
    const code = await dispatch(parseArgs(['add', 'dropzone']));
    expect(spy).toHaveBeenCalledOnce();
    expect(code).toBe(0);
    spy.mockRestore();
  });

  it('routes "restore" to the restore handler', async () => {
    const spy = vi.spyOn(handlers, 'restore').mockResolvedValue(0);
    const code = await dispatch(parseArgs(['restore']));
    expect(spy).toHaveBeenCalledOnce();
    expect(code).toBe(0);
    spy.mockRestore();
  });

  it('returns exit code 1 on an unknown command and writes to stderr', async () => {
    const code = await dispatch(parseArgs(['bogus']));
    expect(code).toBe(1);
    const calls = stderrSpy.mock.calls.flat().join('');
    expect(calls).toMatch(/Unknown command: bogus/);
    expect(calls).toMatch(/--help/);
  });

  it('returns exit code 1 when no command is provided', async () => {
    const code = await dispatch(parseArgs([]));
    expect(code).toBe(1);
    const calls = stderrSpy.mock.calls.flat().join('');
    expect(calls).toMatch(/No command provided/);
  });

  it('registers exactly the three canonical subcommands', () => {
    expect(Object.keys(handlers).sort()).toEqual(['add', 'init', 'restore']);
  });
});
