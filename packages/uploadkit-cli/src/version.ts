// Read the CLI version from the packaged `package.json` at runtime so
// `--version` output always matches the installed binary — no brittle
// hard-coded literal, no build-time injection required.
//
// Resolution:
//   - Built bundle ships as `dist/index.js`; `package.json` sits at `../package.json`
//     relative to the compiled module (tsup does not rewrite this path).
//   - In dev/vitest, `src/version.ts` is executed from `src/`, so the same
//     `..` climb lands on the package root too.
// We fall back to `'0.0.0'` if the read ever fails (e.g. pkg layout changes)
// rather than crashing the CLI on startup.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function readVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkgPath = resolve(here, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      version?: unknown;
    };
    return typeof pkg.version === 'string' && pkg.version.length > 0
      ? pkg.version
      : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export const VERSION = readVersion();
