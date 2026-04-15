import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

// Mock @clack/prompts. Every interactive function returns a queued value.
const answers: unknown[] = [];
const cancelSymbol = Symbol('clack.cancel');

vi.mock('@clack/prompts', () => {
  return {
    intro: vi.fn(),
    outro: vi.fn(),
    cancel: vi.fn(),
    isCancel: (value: unknown) => value === cancelSymbol,
    text: vi.fn(async () => answers.shift()),
    select: vi.fn(async () => answers.shift()),
    confirm: vi.fn(async () => answers.shift()),
  };
});

import * as clack from '@clack/prompts';
import { runPrompts } from '../prompts.js';
import type { ParsedFlags } from '../types.js';

function baseFlags(overrides: Partial<ParsedFlags> = {}): ParsedFlags {
  return {
    positional: undefined,
    template: undefined,
    pm: undefined,
    ts: undefined,
    yes: false,
    install: true,
    git: true,
    force: false,
    help: false,
    version: false,
    errors: [],
    ...overrides,
  };
}

const ORIGINAL_UA = process.env.npm_config_user_agent;
const ORIGINAL_CWD = process.cwd();
let tmpDir: string;

beforeEach(() => {
  answers.length = 0;
  vi.clearAllMocks();
  delete process.env.npm_config_user_agent;
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cua-prompts-'));
  process.chdir(tmpDir);
});

afterEach(() => {
  process.chdir(ORIGINAL_CWD);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if (ORIGINAL_UA === undefined) delete process.env.npm_config_user_agent;
  else process.env.npm_config_user_agent = ORIGINAL_UA;
});

describe('runPrompts — --yes fast path', () => {
  it('skips all prompts when --yes is passed with a positional name', async () => {
    const opts = await runPrompts(baseFlags({ yes: true, positional: 'my-app' }));
    expect(clack.text).not.toHaveBeenCalled();
    expect(clack.select).not.toHaveBeenCalled();
    expect(clack.confirm).not.toHaveBeenCalled();
    expect(opts.name).toBe('my-app');
    expect(opts.template).toBe('next');
    expect(opts.pm).toBe('pnpm');
    expect(opts.typescript).toBe(true);
    expect(opts.install).toBe(true);
    expect(opts.gitInit).toBe(true);
    expect(path.isAbsolute(opts.projectDir)).toBe(true);
  });

  it('with --yes, flag values override defaults', async () => {
    const opts = await runPrompts(
      baseFlags({
        yes: true,
        positional: 'demo',
        template: 'vite',
        pm: 'bun',
        ts: false,
        install: false,
        git: false,
      }),
    );
    expect(opts.template).toBe('vite');
    expect(opts.pm).toBe('bun');
    expect(opts.typescript).toBe(false);
    expect(opts.install).toBe(false);
    expect(opts.gitInit).toBe(false);
  });

  it('non-vite templates force typescript: true even if --no-ts is passed', async () => {
    const opts = await runPrompts(
      baseFlags({
        yes: true,
        positional: 'demo',
        template: 'next',
        ts: false,
      }),
    );
    expect(opts.typescript).toBe(true);
  });
});

describe('runPrompts — interactive', () => {
  it('asks every prompt when no flags are provided (vite → asks TS)', async () => {
    answers.push('my-cool-app'); // name
    answers.push('vite'); // template
    answers.push('npm'); // pm
    answers.push(true); // typescript
    answers.push(true); // install
    answers.push(true); // git
    const opts = await runPrompts(baseFlags());
    expect(clack.text).toHaveBeenCalledTimes(1);
    expect(clack.select).toHaveBeenCalledTimes(2); // template + pm
    expect(clack.confirm).toHaveBeenCalledTimes(3); // ts + install + git
    expect(opts.name).toBe('my-cool-app');
    expect(opts.template).toBe('vite');
    expect(opts.pm).toBe('npm');
    expect(opts.typescript).toBe(true);
  });

  it('skips TypeScript prompt for non-vite templates', async () => {
    answers.push('app-next');
    answers.push('next');
    answers.push('pnpm');
    answers.push(true); // install
    answers.push(true); // git
    const opts = await runPrompts(baseFlags());
    expect(clack.confirm).toHaveBeenCalledTimes(2); // install + git only
    expect(opts.typescript).toBe(true);
    expect(opts.template).toBe('next');
  });

  it('flag values short-circuit their prompts', async () => {
    answers.push('from-prompt'); // only name is asked
    const opts = await runPrompts(
      baseFlags({
        template: 'remix',
        pm: 'yarn',
      }),
    );
    expect(clack.select).not.toHaveBeenCalled();
    // confirm called twice: install + git (remix forces TS)
    expect(clack.confirm).toHaveBeenCalledTimes(2);
    expect(opts.template).toBe('remix');
    expect(opts.pm).toBe('yarn');
    expect(opts.name).toBe('from-prompt');
  });

  it('--no-install skips the install confirm prompt', async () => {
    answers.push('app');
    answers.push('next');
    answers.push('pnpm');
    answers.push(true); // git only
    const opts = await runPrompts(baseFlags({ install: false }));
    expect(clack.confirm).toHaveBeenCalledTimes(1);
    expect(opts.install).toBe(false);
  });

  it('--no-git skips the git confirm prompt', async () => {
    answers.push('app');
    answers.push('next');
    answers.push('pnpm');
    answers.push(true); // install only
    const opts = await runPrompts(baseFlags({ git: false }));
    expect(clack.confirm).toHaveBeenCalledTimes(1);
    expect(opts.gitInit).toBe(false);
  });

  it('cancellation throws a tagged error (exit 130) from any prompt', async () => {
    answers.push(cancelSymbol);
    await expect(runPrompts(baseFlags())).rejects.toMatchObject({
      code: 'CLI_CANCELLED',
      exitCode: 130,
    });
  });

  it('uses detectPm() result as default pm selection when --pm is absent', async () => {
    process.env.npm_config_user_agent = 'bun/1.2.0 node/v20 darwin arm64';
    answers.push('app');
    answers.push('next');
    answers.push('bun'); // user accepts detected default
    answers.push(true); // install
    answers.push(true); // git
    await runPrompts(baseFlags());
    const selectCall = (clack.select as unknown as { mock: { calls: [{ initialValue?: unknown }][] } })
      .mock.calls[1];
    const opts = selectCall?.[0];
    expect(opts?.initialValue).toBe('bun');
  });
});
