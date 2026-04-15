import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock execa BEFORE importing the module under test.
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

import { execa } from 'execa';
import { installPackages } from '../init/install-deps.js';

const execaMock = vi.mocked(execa);

beforeEach(() => {
  execaMock.mockReset();
  // Default: success
  execaMock.mockResolvedValue({ exitCode: 0 } as never);
});

describe('installPackages', () => {
  const pkgs = ['@uploadkitdev/next@latest', '@uploadkitdev/react@latest'];

  function assertCall(expectedBin: string, expectedArgs: string[]): void {
    expect(execaMock).toHaveBeenCalledTimes(1);
    const call = execaMock.mock.calls[0] as unknown as [string, string[], { cwd?: string }];
    expect(call[0]).toBe(expectedBin);
    expect(call[1]).toEqual(expectedArgs);
    expect(call[2]).toMatchObject({ cwd: '/tmp/proj' });
  }

  it('builds pnpm add argv', async () => {
    await installPackages('pnpm', '/tmp/proj', pkgs, {});
    assertCall('pnpm', ['add', ...pkgs]);
  });

  it('builds npm install argv', async () => {
    await installPackages('npm', '/tmp/proj', pkgs, {});
    assertCall('npm', ['install', ...pkgs]);
  });

  it('builds yarn add argv', async () => {
    await installPackages('yarn', '/tmp/proj', pkgs, {});
    assertCall('yarn', ['add', ...pkgs]);
  });

  it('builds bun add argv', async () => {
    await installPackages('bun', '/tmp/proj', pkgs, {});
    assertCall('bun', ['add', ...pkgs]);
  });

  it('throws when the PM exits non-zero', async () => {
    execaMock.mockRejectedValueOnce(
      Object.assign(new Error('pnpm add failed'), { exitCode: 1 }),
    );
    await expect(
      installPackages('pnpm', '/tmp/proj', pkgs, {}),
    ).rejects.toThrow(/pnpm add failed/);
  });

  it('is a no-op when skipInstall=true', async () => {
    await installPackages('pnpm', '/tmp/proj', pkgs, { skipInstall: true });
    expect(execaMock).not.toHaveBeenCalled();
  });

  it('is a no-op when pkgs is empty', async () => {
    await installPackages('pnpm', '/tmp/proj', [], {});
    expect(execaMock).not.toHaveBeenCalled();
  });
});
