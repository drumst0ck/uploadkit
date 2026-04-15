import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hasMarkers, wrapWithMarkers, stripMarkerBlock, MARKER_START, MARKER_END } from '../codemods/markers.js';
import { addImport } from '../codemods/imports.js';
import { mergeEnv } from '../codemods/env.js';

describe('markers', () => {
  it('MARKER_START/END are the D-06 line comments', () => {
    expect(MARKER_START).toBe('// uploadkit:start');
    expect(MARKER_END).toBe('// uploadkit:end');
  });

  it('hasMarkers returns true when both markers present', () => {
    const source = `foo\n${MARKER_START}\nblock\n${MARKER_END}\nbar`;
    expect(hasMarkers(source)).toBe(true);
  });

  it('hasMarkers returns false when absent', () => {
    expect(hasMarkers('just some code')).toBe(false);
  });

  it('hasMarkers returns false when only start present', () => {
    expect(hasMarkers(`foo\n${MARKER_START}\nunclosed`)).toBe(false);
  });

  it('wrapWithMarkers wraps a block with newlines', () => {
    const out = wrapWithMarkers('const x = 1;');
    expect(out.startsWith(MARKER_START)).toBe(true);
    expect(out.endsWith(MARKER_END)).toBe(true);
    expect(out).toContain('const x = 1;');
    expect(hasMarkers(out)).toBe(true);
  });

  it('stripMarkerBlock extracts and removes the block', () => {
    const inner = 'inserted line\nanother line';
    const source = `before\n${wrapWithMarkers(inner)}\nafter`;
    const { stripped, block } = stripMarkerBlock(source);
    expect(block).toBe(inner);
    expect(stripped).not.toContain(MARKER_START);
    expect(stripped).not.toContain(MARKER_END);
    expect(stripped).toContain('before');
    expect(stripped).toContain('after');
  });

  it('stripMarkerBlock returns null block when no markers', () => {
    const source = 'no markers here';
    const { stripped, block } = stripMarkerBlock(source);
    expect(block).toBeNull();
    expect(stripped).toBe(source);
  });
});

describe('addImport', () => {
  it('adds a new named import', () => {
    const src = `export const x = 1;\n`;
    const out = addImport(src, { from: '@uploadkitdev/react', specifiers: ['UploadKitProvider'] });
    expect(out).toContain('UploadKitProvider');
    expect(out).toContain('@uploadkitdev/react');
  });

  it('is a no-op when the same specifier from same module is already present', () => {
    const src = `import { UploadKitProvider } from '@uploadkitdev/react';\nexport const x = 1;\n`;
    const out = addImport(src, { from: '@uploadkitdev/react', specifiers: ['UploadKitProvider'] });
    // Should still have exactly one import declaration for that module
    const matches = out.match(/@uploadkitdev\/react/g) || [];
    expect(matches.length).toBe(1);
    const providerMatches = out.match(/UploadKitProvider/g) || [];
    // one in import, one in existing code? here only import
    expect(providerMatches.length).toBe(1);
  });

  it('adds additional specifiers to existing import from same module', () => {
    const src = `import { UploadKitProvider } from '@uploadkitdev/react';\n`;
    const out = addImport(src, { from: '@uploadkitdev/react', specifiers: ['UploadButton'] });
    expect(out).toContain('UploadKitProvider');
    expect(out).toContain('UploadButton');
  });

  it('adds multiple specifiers at once', () => {
    const src = ``;
    const out = addImport(src, { from: '@uploadkitdev/react', specifiers: ['A', 'B'] });
    expect(out).toContain('A');
    expect(out).toContain('B');
    expect(out).toContain('@uploadkitdev/react');
  });
});

describe('mergeEnv', () => {
  let dir: string;
  let envPath: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'uploadkit-env-'));
    envPath = join(dir, '.env.local');
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates the file when it does not exist', async () => {
    const added = await mergeEnv(envPath, { UPLOADKIT_API_KEY: 'sk_test' });
    expect(added).toEqual(['UPLOADKIT_API_KEY']);
    expect(existsSync(envPath)).toBe(true);
    const content = readFileSync(envPath, 'utf8');
    expect(content).toContain('UPLOADKIT_API_KEY=sk_test');
  });

  it('preserves existing key and returns empty added list', async () => {
    writeFileSync(envPath, '# existing\nUPLOADKIT_API_KEY=user_value\n', 'utf8');
    const added = await mergeEnv(envPath, { UPLOADKIT_API_KEY: 'new_value' });
    expect(added).toEqual([]);
    const content = readFileSync(envPath, 'utf8');
    expect(content).toContain('UPLOADKIT_API_KEY=user_value');
    expect(content).not.toContain('new_value');
    expect(content).toContain('# existing');
  });

  it('appends only missing keys', async () => {
    writeFileSync(envPath, 'EXISTING=1\n', 'utf8');
    const added = await mergeEnv(envPath, { EXISTING: '2', NEW_KEY: 'val' });
    expect(added).toEqual(['NEW_KEY']);
    const content = readFileSync(envPath, 'utf8');
    expect(content).toContain('EXISTING=1');
    expect(content).toContain('NEW_KEY=val');
    expect(content).not.toContain('EXISTING=2');
  });

  it('ignores comments when detecting existing keys', async () => {
    writeFileSync(envPath, '# UPLOADKIT_API_KEY=commented\n', 'utf8');
    const added = await mergeEnv(envPath, { UPLOADKIT_API_KEY: 'real' });
    expect(added).toEqual(['UPLOADKIT_API_KEY']);
    const content = readFileSync(envPath, 'utf8');
    expect(content).toContain('UPLOADKIT_API_KEY=real');
    expect(content).toContain('# UPLOADKIT_API_KEY=commented');
  });
});
