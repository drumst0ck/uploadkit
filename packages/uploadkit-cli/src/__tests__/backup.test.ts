import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBackupSession } from '../backup/backup.js';
import { readManifests } from '../backup/restore-manifest.js';
import { wrapChildrenOf } from '../codemods/jsx-wrap.js';
import { hasMarkers, MARKER_START } from '../codemods/markers.js';

describe('backup pipeline', () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'uploadkit-backup-'));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('save() copies a file into the session dir preserving relative path', async () => {
    const filePath = join(root, 'app', 'layout.tsx');
    mkdirSync(join(root, 'app'), { recursive: true });
    writeFileSync(filePath, 'export default function L() { return null; }', 'utf8');

    const session = createBackupSession(root);
    await session.save(filePath);
    const manifest = await session.finalize();

    const backupFile = join(session.dir, 'app', 'layout.tsx');
    expect(existsSync(backupFile)).toBe(true);
    expect(readFileSync(backupFile, 'utf8')).toContain('export default');

    expect(manifest.timestamp).toBe(session.timestamp);
    expect(manifest.root).toBe(root);
    expect(manifest.entries).toHaveLength(1);
    expect(manifest.entries[0]).toMatchObject({
      action: 'modify',
      relativePath: join('app', 'layout.tsx'),
      backupPath: join('app', 'layout.tsx'),
    });

    // Manifest.json exists on disk
    const manifestJson = JSON.parse(readFileSync(join(session.dir, 'manifest.json'), 'utf8'));
    expect(manifestJson.entries).toHaveLength(1);
  });

  it('recordCreate() adds a create entry without copying', async () => {
    const session = createBackupSession(root);
    session.recordCreate(join(root, 'app', 'api', 'uploadkit', '[...uploadkit]', 'route.ts'));
    const manifest = await session.finalize();

    expect(manifest.entries).toHaveLength(1);
    expect(manifest.entries[0]).toMatchObject({
      action: 'create',
      relativePath: join('app', 'api', 'uploadkit', '[...uploadkit]', 'route.ts'),
    });
    expect(manifest.entries[0]?.backupPath).toBeUndefined();
  });

  it('finalize() adds .uploadkit-backup/ to .gitignore idempotently', async () => {
    const gitignorePath = join(root, '.gitignore');

    // First run — no .gitignore exists
    const s1 = createBackupSession(root);
    s1.recordCreate(join(root, 'foo.txt'));
    await s1.finalize();
    expect(existsSync(gitignorePath)).toBe(true);
    const firstContent = readFileSync(gitignorePath, 'utf8');
    expect(firstContent).toContain('.uploadkit-backup/');

    // Second run — gitignore already has the entry
    const s2 = createBackupSession(root);
    s2.recordCreate(join(root, 'bar.txt'));
    await s2.finalize();
    const secondContent = readFileSync(gitignorePath, 'utf8');
    const occurrences = (secondContent.match(/\.uploadkit-backup\//g) || []).length;
    expect(occurrences).toBe(1);
  });

  it('finalize() appends to existing .gitignore without clobbering entries', async () => {
    const gitignorePath = join(root, '.gitignore');
    writeFileSync(gitignorePath, 'node_modules\ndist\n', 'utf8');

    const session = createBackupSession(root);
    session.recordCreate(join(root, 'foo.txt'));
    await session.finalize();

    const content = readFileSync(gitignorePath, 'utf8');
    expect(content).toContain('node_modules');
    expect(content).toContain('dist');
    expect(content).toContain('.uploadkit-backup/');
  });

  it('readManifests returns sessions sorted by timestamp desc', async () => {
    const s1 = createBackupSession(root, { timestamp: '2026-01-01T00-00-00Z' });
    s1.recordCreate(join(root, 'a.txt'));
    await s1.finalize();

    const s2 = createBackupSession(root, { timestamp: '2026-02-01T00-00-00Z' });
    s2.recordCreate(join(root, 'b.txt'));
    await s2.finalize();

    const manifests = await readManifests(root);
    expect(manifests).toHaveLength(2);
    expect(manifests[0]?.timestamp).toBe('2026-02-01T00-00-00Z');
    expect(manifests[1]?.timestamp).toBe('2026-01-01T00-00-00Z');
  });

  it('readManifests returns [] when no backup dir exists', async () => {
    const manifests = await readManifests(root);
    expect(manifests).toEqual([]);
  });
});

describe('wrapChildrenOf', () => {
  it('wraps <body> children with the provider (Next.js App Router style)', () => {
    const source = `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
`;
    const out = wrapChildrenOf(source, {
      parentTag: 'body',
      wrapperOpen: '<UploadKitProvider>',
      wrapperClose: '</UploadKitProvider>',
    });
    expect(out).toContain('<UploadKitProvider>');
    expect(out).toContain('</UploadKitProvider>');
    expect(out).toContain('{children}');
    // Markers bound the inserted block
    expect(hasMarkers(out)).toBe(true);
    // Body still exists
    expect(out).toMatch(/<body[^>]*>/);
    expect(out).toContain('</body>');
  });

  it('is idempotent — a second run returns unchanged source', () => {
    const source = `export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
      </body>
    </html>
  );
}
`;
    const once = wrapChildrenOf(source, {
      parentTag: 'body',
      wrapperOpen: '<UploadKitProvider>',
      wrapperClose: '</UploadKitProvider>',
    });
    const twice = wrapChildrenOf(once, {
      parentTag: 'body',
      wrapperOpen: '<UploadKitProvider>',
      wrapperClose: '</UploadKitProvider>',
    });
    expect(twice).toBe(once);
  });

  it('preserves sibling providers — inserts INSIDE body, does not replace', () => {
    const source = `export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
`;
    const out = wrapChildrenOf(source, {
      parentTag: 'body',
      wrapperOpen: '<UploadKitProvider>',
      wrapperClose: '</UploadKitProvider>',
    });
    expect(out).toContain('<ThemeProvider>');
    expect(out).toContain('<AuthProvider>');
    expect(out).toContain('<UploadKitProvider>');
    expect(out.indexOf(MARKER_START)).toBeGreaterThan(out.indexOf('<body'));
    expect(out.indexOf(MARKER_START)).toBeLessThan(out.indexOf('</body>'));
  });

  it('throws a clear error when the parent tag is missing', () => {
    const source = `export default function RootLayout() { return <div>no body</div>; }\n`;
    expect(() =>
      wrapChildrenOf(source, {
        parentTag: 'body',
        wrapperOpen: '<UploadKitProvider>',
        wrapperClose: '</UploadKitProvider>',
      }),
    ).toThrow(/body/);
  });
});
