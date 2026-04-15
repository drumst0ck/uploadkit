import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { detectPm, PACKAGE_MANAGERS } from '../pm.js';

const ORIGINAL = process.env.npm_config_user_agent;

describe('detectPm', () => {
  beforeEach(() => {
    delete process.env.npm_config_user_agent;
  });

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.npm_config_user_agent;
    else process.env.npm_config_user_agent = ORIGINAL;
  });

  it('detects pnpm from user agent', () => {
    process.env.npm_config_user_agent = 'pnpm/9.0.0 npm/? node/v20.0.0 linux x64';
    expect(detectPm()).toBe('pnpm');
  });

  it('detects yarn from user agent', () => {
    process.env.npm_config_user_agent = 'yarn/4.0.0 npm/? node/v20.0.0 linux x64';
    expect(detectPm()).toBe('yarn');
  });

  it('detects bun from user agent', () => {
    process.env.npm_config_user_agent = 'bun/1.2.0 npm/? node/v20.0.0 linux x64';
    expect(detectPm()).toBe('bun');
  });

  it('detects npm when user agent starts with npm/', () => {
    process.env.npm_config_user_agent = 'npm/10.0.0 node/v20.0.0 linux x64';
    expect(detectPm()).toBe('npm');
  });

  it('falls back to pnpm when env is empty', () => {
    delete process.env.npm_config_user_agent;
    expect(detectPm()).toBe('pnpm');
  });

  it('falls back to pnpm for unknown user agents', () => {
    process.env.npm_config_user_agent = 'deno/1.0';
    expect(detectPm()).toBe('pnpm');
  });

  it('exports the PACKAGE_MANAGERS tuple', () => {
    expect(PACKAGE_MANAGERS).toEqual(['pnpm', 'npm', 'yarn', 'bun']);
  });
});
