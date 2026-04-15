import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import {
  COMPONENTS,
  COMPONENT_ALIASES,
  isComponentAlias,
  type ComponentAlias,
} from '../add/catalog.js';
import { insertComponent } from '../add/insert-component.js';
import { listCandidates, promptForTargetFile } from '../add/prompt-target.js';
import { createBackupSession } from '../backup/backup.js';
import { run as addRun } from '../commands/add.js';
import { parseArgs } from '../args.js';

const FIXTURES_DIR = resolve(
  dirname(new URL(import.meta.url).pathname),
  '..',
  '__fixtures__',
  'projects',
);

function cloneFixture(name: 'next-app' | 'remix' | 'vite-react' | 'sveltekit'): string {
  const src = join(FIXTURES_DIR, name);
  const dir = mkdtempSync(join(tmpdir(), `uploadkit-add-${name}-`));
  cpSync(src, dir, { recursive: true });
  return dir;
}

// --------------------------------------------------------------------------
// catalog
// --------------------------------------------------------------------------

describe('add/catalog', () => {
  it('exports exactly 6 canonical aliases', () => {
    expect(COMPONENT_ALIASES).toHaveLength(6);
    expect(new Set(COMPONENT_ALIASES)).toEqual(
      new Set(['dropzone', 'button', 'modal', 'gallery', 'queue', 'progress']),
    );
  });

  it('maps each alias to @uploadkitdev/react named export', () => {
    for (const alias of COMPONENT_ALIASES) {
      const spec = COMPONENTS[alias];
      expect(spec.pkg).toBe('@uploadkitdev/react');
      expect(typeof spec.import).toBe('string');
      expect(spec.import.length).toBeGreaterThan(0);
    }
  });

  it('isComponentAlias narrows on known aliases only', () => {
    expect(isComponentAlias('dropzone')).toBe(true);
    expect(isComponentAlias('progress')).toBe(true);
    expect(isComponentAlias('cropper')).toBe(false);
    expect(isComponentAlias('')).toBe(false);
  });
});

// --------------------------------------------------------------------------
// prompt-target — non-interactive paths only
// --------------------------------------------------------------------------

describe('add/prompt-target', () => {
  it('honors --target flag and validates extension', async () => {
    const root = cloneFixture('next-app');
    // Create a page.tsx for listCandidates to find.
    mkdirSync(join(root, 'app', 'dashboard'), { recursive: true });
    const target = join(root, 'app', 'dashboard', 'page.tsx');
    writeFileSync(
      target,
      'export default function Page() { return <main></main>; }\n',
      'utf8',
    );

    const resolved = await promptForTargetFile({
      root,
      framework: 'next-app',
      targetFlag: 'app/dashboard/page.tsx',
      yes: true,
    });
    expect(resolved).toBe(target);
  });

  it('rejects non-existent --target', async () => {
    const root = cloneFixture('next-app');
    await expect(
      promptForTargetFile({
        root,
        framework: 'next-app',
        targetFlag: 'app/does-not-exist.tsx',
        yes: true,
      }),
    ).rejects.toThrow(/does not exist/);
  });

  it('rejects --target with wrong extension', async () => {
    const root = cloneFixture('next-app');
    writeFileSync(join(root, 'README.md'), '# hi\n', 'utf8');
    await expect(
      promptForTargetFile({
        root,
        framework: 'next-app',
        targetFlag: 'README.md',
        yes: true,
      }),
    ).rejects.toThrow(/\.tsx or \.jsx/);
  });

  it('listCandidates finds next-app page.tsx files, excludes declarations', async () => {
    const root = cloneFixture('next-app');
    mkdirSync(join(root, 'app', 'users'), { recursive: true });
    writeFileSync(
      join(root, 'app', 'users', 'page.tsx'),
      'export default function Page() { return <div /> }\n',
      'utf8',
    );
    mkdirSync(join(root, 'app', 'settings'), { recursive: true });
    writeFileSync(
      join(root, 'app', 'settings', 'page.tsx'),
      'export default function Page() { return <div /> }\n',
      'utf8',
    );
    // layout.tsx exists but should NOT be a candidate (glob is page.tsx only).
    const hits = await listCandidates(root, 'next-app');
    const rels = hits.map((h) => h.split('/').slice(-3).join('/'));
    expect(rels.some((r) => r.endsWith('users/page.tsx'))).toBe(true);
    expect(rels.some((r) => r.endsWith('settings/page.tsx'))).toBe(true);
    expect(rels.some((r) => r.endsWith('layout.tsx'))).toBe(false);
  });

  it('listCandidates for vite-react excludes main.tsx', async () => {
    const root = cloneFixture('vite-react');
    const hits = await listCandidates(root, 'vite-react');
    const names = hits.map((h) => h.split('/').pop());
    expect(names).not.toContain('main.tsx');
    expect(names).toContain('App.tsx');
  });

  it('--yes path with zero candidates throws', async () => {
    const root = mkdtempSync(join(tmpdir(), 'uploadkit-empty-'));
    // Fake next-app root (no app/ dir).
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'x' }), 'utf8');
    await expect(
      promptForTargetFile({
        root,
        framework: 'next-app',
        targetFlag: undefined,
        yes: true,
      }),
    ).rejects.toThrow(/No candidate .tsx/);
  });
});

// --------------------------------------------------------------------------
// insert-component — the real mutation
// --------------------------------------------------------------------------

describe('add/insert-component', () => {
  let root: string;
  let target: string;

  beforeEach(() => {
    root = cloneFixture('next-app');
    mkdirSync(join(root, 'app', 'hello'), { recursive: true });
    target = join(root, 'app', 'hello', 'page.tsx');
    writeFileSync(
      target,
      [
        "export default function Page() {",
        "  return (",
        "    <main>",
        "      <h1>Hello</h1>",
        "    </main>",
        "  );",
        "}",
        '',
      ].join('\n'),
      'utf8',
    );
  });

  it('adds import + JSX usage for dropzone into first returned element', async () => {
    const session = createBackupSession(root, { timestamp: '2026-04-15T00-00-00Z' });
    const res = await insertComponent(target, 'dropzone', { session });
    await session.finalize();

    expect(res.skipped).toBe(false);
    expect(res.modified).toBe(true);

    const next = readFileSync(target, 'utf8');
    expect(next).toMatch(/import \{\s*UploadDropzone\s*\} from ["']@uploadkitdev\/react["']/);
    expect(next).toContain('<UploadDropzone');
    expect(next).toContain('uploadkit:start — dropzone');
    expect(next).toContain('uploadkit:end — dropzone');

    // Snippet lives INSIDE <main>, before <h1> (first child).
    const mainOpen = next.indexOf('<main>');
    const startMarker = next.indexOf('uploadkit:start — dropzone');
    const h1 = next.indexOf('<h1>');
    expect(mainOpen).toBeGreaterThan(-1);
    expect(startMarker).toBeGreaterThan(mainOpen);
    expect(startMarker).toBeLessThan(h1);

    // <h1> content preserved.
    expect(next).toContain('<h1>Hello</h1>');
  });

  it('second insert of same alias is a no-op (skipped=true)', async () => {
    const s1 = createBackupSession(root, { timestamp: '2026-04-15T00-00-01Z' });
    await insertComponent(target, 'dropzone', { session: s1 });
    await s1.finalize();
    const afterFirst = readFileSync(target, 'utf8');

    const s2 = createBackupSession(root, { timestamp: '2026-04-15T00-00-02Z' });
    const res = await insertComponent(target, 'dropzone', { session: s2 });
    expect(res.skipped).toBe(true);
    expect(res.modified).toBe(false);

    // File unchanged between runs.
    expect(readFileSync(target, 'utf8')).toBe(afterFirst);
  });

  it('two different aliases coexist in one file', async () => {
    const s1 = createBackupSession(root, { timestamp: '2026-04-15T00-00-10Z' });
    await insertComponent(target, 'dropzone', { session: s1 });
    await s1.finalize();

    const s2 = createBackupSession(root, { timestamp: '2026-04-15T00-00-11Z' });
    const res = await insertComponent(target, 'button', { session: s2 });
    await s2.finalize();
    expect(res.skipped).toBe(false);

    const next = readFileSync(target, 'utf8');
    expect(next).toContain('UploadDropzone');
    expect(next).toContain('UploadButton');
    expect(next).toContain('uploadkit:start — dropzone');
    expect(next).toContain('uploadkit:start — button');
  });

  it('backs up the target file byte-for-byte before mutation', async () => {
    const original = readFileSync(target);
    const session = createBackupSession(root, { timestamp: '2026-04-15T00-00-20Z' });
    await insertComponent(target, 'progress', { session });
    await session.finalize();

    // Session dir has a backup copy that matches the original bytes.
    const relPath = target.slice(root.length + 1);
    const backupCopy = readFileSync(join(session.dir, relPath));
    expect(backupCopy.equals(original)).toBe(true);
  });

  it('works for every alias in the catalog', async () => {
    for (const alias of COMPONENT_ALIASES) {
      // Fresh fixture per alias to keep the assertion focused.
      const r = cloneFixture('next-app');
      mkdirSync(join(r, 'app', 'x'), { recursive: true });
      const t = join(r, 'app', 'x', 'page.tsx');
      writeFileSync(
        t,
        'export default function Page() { return (<main><span /></main>); }\n',
        'utf8',
      );
      const session = createBackupSession(r, { timestamp: `2026-04-15T01-00-${alias}` });
      const res = await insertComponent(t, alias as ComponentAlias, { session });
      expect(res.skipped, `insert ${alias}`).toBe(false);
      const src = readFileSync(t, 'utf8');
      expect(src, `marker for ${alias}`).toContain(`uploadkit:start — ${alias}`);
      expect(src, `import for ${alias}`).toContain(COMPONENTS[alias as ComponentAlias].import);
    }
  });
});

// --------------------------------------------------------------------------
// commands/add.ts — orchestrator surface
// --------------------------------------------------------------------------

describe('commands/add.ts', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    cwdSpy?.mockRestore();
  });

  it('unknown alias → exits 1 and prints catalog', async () => {
    const root = cloneFixture('next-app');
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(root);

    const code = await addRun(parseArgs(['add', 'cropper']));
    expect(code).toBe(1);
    const err = stderrSpy.mock.calls.flat().join('');
    expect(err).toMatch(/Unknown component: cropper/);
    expect(err).toMatch(/dropzone/);
  });

  it('missing alias → exits 1 with usage hint', async () => {
    const root = cloneFixture('next-app');
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(root);

    const code = await addRun(parseArgs(['add']));
    expect(code).toBe(1);
    const err = stderrSpy.mock.calls.flat().join('');
    expect(err).toMatch(/Missing component name/);
  });

  it('sveltekit fixture → polite refusal, exit 1', async () => {
    const root = cloneFixture('sveltekit');
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(root);

    const code = await addRun(parseArgs(['add', 'dropzone']));
    expect(code).toBe(1);
    const err = stderrSpy.mock.calls.flat().join('');
    expect(err).toMatch(/React frameworks only/);
  });

  it('end-to-end: add dropzone --target app/page.tsx --yes', async () => {
    const root = cloneFixture('next-app');
    // Create a user-facing page.tsx.
    const pagePath = join(root, 'app', 'page.tsx');
    writeFileSync(
      pagePath,
      'export default function Page() { return (<main><p>hi</p></main>); }\n',
      'utf8',
    );
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(root);

    const code = await addRun(parseArgs(['add', 'dropzone', '--target', 'app/page.tsx', '--yes']));
    expect(code).toBe(0);
    const src = readFileSync(pagePath, 'utf8');
    expect(src).toContain('UploadDropzone');
    expect(src).toContain('uploadkit:start — dropzone');
    // .uploadkit-backup dir exists (session was finalized).
    expect(existsSync(join(root, '.uploadkit-backup'))).toBe(true);
  });

  it('end-to-end: re-running add dropzone is idempotent', async () => {
    const root = cloneFixture('next-app');
    const pagePath = join(root, 'app', 'page.tsx');
    writeFileSync(
      pagePath,
      'export default function Page() { return (<main />); }\n',
      'utf8',
    );
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(root);

    // First run — should succeed. (Note: <main /> is self-closing; expect fallback.)
    const pageWithChildren = 'export default function Page() { return (<main><p>hi</p></main>); }\n';
    writeFileSync(pagePath, pageWithChildren, 'utf8');

    const code1 = await addRun(parseArgs(['add', 'dropzone', '--target', 'app/page.tsx', '--yes']));
    expect(code1).toBe(0);
    const afterFirst = readFileSync(pagePath, 'utf8');

    const code2 = await addRun(parseArgs(['add', 'dropzone', '--target', 'app/page.tsx', '--yes']));
    expect(code2).toBe(0);

    // Second run prints "already present"
    const out = stdoutSpy.mock.calls.flat().join('');
    expect(out).toMatch(/already present/);
    expect(readFileSync(pagePath, 'utf8')).toBe(afterFirst);
  });
});
