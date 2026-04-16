import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';
import { mergeEnv } from '../codemods/index.js';
import { installPackages } from './install-deps.js';
import type { InitImpl } from './types.js';

// Paths the SvelteKit init flow creates. Relative to project root.
const REL_ROUTE = join(
  'src',
  'routes',
  'api',
  'uploadkit',
  '[...uploadkit]',
  '+server.ts',
);
const REL_CLIENT = join('src', 'lib', 'uploadkit.ts');
const REL_ENV = '.env';

// Canonical SDK specifiers for SvelteKit. No React provider — SvelteKit users
// wire UploadKit into their own components via the Svelte UploadKit SDK when
// released. Until then, the core client gives them a typed server handler.
const PKGS = ['@uploadkitdev/core@latest'];

const TEMPLATE_DIR = resolve(fileURLToPath(import.meta.url), '..', 'templates');

async function loadTemplate(name: string): Promise<string> {
  return readFile(join(TEMPLATE_DIR, name), 'utf8');
}

async function writeIfAbsent(
  absPath: string,
  contents: string,
  session: { recordCreate: (p: string) => void },
  createdList: string[],
): Promise<boolean> {
  if (existsSync(absPath)) return false;
  await mkdir(dirname(absPath), { recursive: true });
  await writeFile(absPath, contents, 'utf8');
  session.recordCreate(absPath);
  createdList.push(absPath);
  return true;
}

/**
 * `init` implementation for SvelteKit.
 *
 * SvelteKit has no React provider surface, so we do NOT touch any `.svelte`
 * file. Instead we:
 *   1. Create `src/routes/api/uploadkit/[...uploadkit]/+server.ts`
 *   2. Create `src/lib/uploadkit.ts` server client
 *   3. Merge `.env` with `UPLOADKIT_API_KEY=uk_test_placeholder`
 *   4. Install `@uploadkitdev/core`
 *
 * Idempotency: if `+server.ts` and `src/lib/uploadkit.ts` both exist, return
 * `{skipped: true}` without touching anything.
 */
export const initSvelteKit: InitImpl = async (ctx, getSession) => {
  const { root, flags, detection } = ctx;

  const routeAbs = join(root, REL_ROUTE);
  const clientAbs = join(root, REL_CLIENT);
  const envAbs = join(root, REL_ENV);

  // --- (1) Idempotency ----------------------------------------------------
  // Content-based detection: check for route, client stub, and env key.
  // Covers both `create-uploadkit-app` scaffolds and prior `uploadkit init`.
  const hasRoute = existsSync(routeAbs);
  const hasClient = existsSync(clientAbs);
  const hasEnvKey =
    existsSync(envAbs) &&
    (await readFile(envAbs, 'utf8')).includes('UPLOADKIT_API_KEY');

  // Fully configured — nothing to do.
  if (hasRoute && hasClient && hasEnvKey) {
    return { skipped: true, installed: [], created: [], modified: [] };
  }

  // Partial repair: only apply missing pieces.
  const skipRoute = hasRoute;
  const skipClient = hasClient;
  const skipEnv = hasEnvKey;

  // SvelteKit has no strict file-level precondition beyond the detector
  // having already asserted `svelte.config.*` exists. Materialize the
  // session now — any state touched below goes into the manifest.
  const session = getSession();

  const created: string[] = [];
  const modified: string[] = [];

  // --- (2) Create +server.ts --------------------------------------------
  if (!skipRoute) {
    const routeTemplate = await loadTemplate('sveltekit-server.ts.tpl');
    await writeIfAbsent(routeAbs, routeTemplate, session, created);
  }

  // --- (3) Create src/lib/uploadkit.ts ---------------------------------
  if (!skipClient) {
    const clientTemplate = await loadTemplate('sveltekit-client.ts.tpl');
    await writeIfAbsent(clientAbs, clientTemplate, session, created);
  }

  // --- (4) Merge .env ---------------------------------------------------
  if (!skipEnv) {
    const envExisted = existsSync(envAbs);
    const appended = await mergeEnv(envAbs, {
      UPLOADKIT_API_KEY: 'uk_test_placeholder',
    });
    if (!envExisted) {
      session.recordCreate(envAbs);
      created.push(envAbs);
    } else if (appended.length > 0) {
      modified.push(envAbs);
    }
  }

  // --- (5) Install packages ---------------------------------------------
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

  return { skipped: false, installed: PKGS, created, modified };
};
