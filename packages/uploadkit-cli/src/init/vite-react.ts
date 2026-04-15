import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';
import { addImport, hasMarkers, mergeEnv, wrapChildrenOf } from '../codemods/index.js';
import { installPackages } from './install-deps.js';
import type { InitImpl } from './types.js';

// Paths the Vite+React init flow touches. Relative to project root.
const REL_MAIN = join('src', 'main.tsx');
const REL_ENV = '.env';

// Client-only — no server. Only @uploadkitdev/react is installed.
const PKGS = ['@uploadkitdev/react@latest'];

const REACT_MODULE = '@uploadkitdev/react';
const PROVIDER_LOCAL = 'UploadKitProvider';

// Unused at runtime but kept for parity with the other impls and in case the
// warning template needs to be loaded from disk in a future iteration.
const TEMPLATE_DIR = resolve(fileURLToPath(import.meta.url), '..', 'templates');
void TEMPLATE_DIR;

const WARNING_MESSAGE =
  "[uploadkit] Vite + React is a client-only framework. UploadKit uploads need a server to sign requests — either pair this app with a backend or use BYOS presigned URLs. See https://uploadkit.dev/docs/vite.\n";

/**
 * `init` implementation for Vite + React.
 *
 * Vite has no server runtime of its own, so we DO NOT create a route handler.
 * We wrap the root render call inside a `<UploadKitProvider>` and surface a
 * warning explaining that a backend (or BYOS) is still required in prod.
 *
 * Steps:
 *   1. Idempotency check (markers in main.tsx).
 *   2. Back up `src/main.tsx`.
 *   3. Rewrite main.tsx: addImport + wrapChildrenOf('StrictMode', provider).
 *      Projects without StrictMode wrap App directly — we detect that fallback.
 *   4. Merge `.env` with `VITE_UPLOADKIT_API_KEY=uk_test_placeholder`.
 *   5. Install `@uploadkitdev/react`.
 *   6. Emit the server-required warning on stderr.
 */
export const initViteReact: InitImpl = async (ctx, session) => {
  const { root, flags, detection } = ctx;

  const mainAbs = join(root, REL_MAIN);
  const envAbs = join(root, REL_ENV);

  if (!existsSync(mainAbs)) {
    throw new Error(
      `src/main.tsx not found at ${mainAbs}. Run uploadkit init from the project root.`,
    );
  }

  // --- (1) Idempotency ----------------------------------------------------
  const existingMain = await readFile(mainAbs, 'utf8');
  if (hasMarkers(existingMain) && existingMain.includes(REACT_MODULE)) {
    return { skipped: true, installed: [], created: [], modified: [] };
  }

  const created: string[] = [];
  const modified: string[] = [];

  // --- (2) Back up main.tsx ----------------------------------------------
  await session.save(mainAbs);

  // --- (3) Rewrite main.tsx ----------------------------------------------
  const withImport = addImport(existingMain, {
    from: REACT_MODULE,
    specifiers: [PROVIDER_LOCAL],
  });
  // Prefer wrapping StrictMode's children; fall back to wrapping inside the
  // root element (div#root replacement isn't safe, so error if no anchor).
  const parentTag = withImport.includes('<StrictMode') ? 'StrictMode' : null;
  if (!parentTag) {
    throw new Error(
      'initViteReact: expected <StrictMode> in src/main.tsx as a wrap anchor. Add <StrictMode> around <App /> and re-run.',
    );
  }
  const wrapped = wrapChildrenOf(withImport, {
    parentTag,
    wrapperOpen: `<${PROVIDER_LOCAL} endpoint="/api/uploadkit">`,
    wrapperClose: `</${PROVIDER_LOCAL}>`,
  });
  if (wrapped !== existingMain) {
    await writeFile(mainAbs, wrapped, 'utf8');
    modified.push(mainAbs);
  }

  // --- (4) Merge .env (VITE_ prefix — Vite exposes these to the browser) --
  const envExisted = existsSync(envAbs);
  const appended = await mergeEnv(envAbs, {
    VITE_UPLOADKIT_API_KEY: 'uk_test_placeholder',
  });
  if (!envExisted) {
    session.recordCreate(envAbs);
    created.push(envAbs);
  } else if (appended.length > 0) {
    modified.push(envAbs);
  }

  // --- (5) Install packages ----------------------------------------------
  await installPackages(detection.packageManager, root, PKGS, {
    skipInstall: flags.skipInstall,
  });

  if (flags.skipInstall) {
    process.stdout.write(
      `${pc.dim('[uploadkit]')} --skip-install: run ${pc.cyan(
        `${detection.packageManager} add ${PKGS.join(' ')}`,
      )} to complete setup.\n`,
    );
  }

  // --- (6) Warning about server requirement ------------------------------
  process.stderr.write(pc.yellow(WARNING_MESSAGE));

  return { skipped: false, installed: PKGS, created, modified };
};
