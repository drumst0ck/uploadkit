import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';
import { addImport, mergeEnv, wrapChildrenOf } from '../codemods/index.js';
import { installPackages } from './install-deps.js';
import type { InitImpl } from './types.js';

// Paths the Remix/RR7 init flow touches. Relative to project root.
const REL_ROOT = join('app', 'root.tsx');
const REL_ROUTE = join('app', 'routes', 'api.uploadkit.$.tsx');
const REL_ENV = '.env';

const PKGS = ['@uploadkitdev/react@latest', '@uploadkitdev/core@latest'];

const REACT_MODULE = '@uploadkitdev/react';
const PROVIDER_LOCAL = 'UploadKitProvider';

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
 * `init` implementation for Remix / React Router v7.
 *
 * Steps:
 *   1. Idempotency check: markers present in root.tsx + route handler exists.
 *   2. Back up `app/root.tsx`.
 *   3. Rewrite root.tsx: addImport UploadKitProvider + wrap <body> children.
 *   4. Create `app/routes/api.uploadkit.$.tsx` from template.
 *   5. Merge `.env` with `UPLOADKIT_API_KEY=uk_test_placeholder`.
 *   6. Install `@uploadkitdev/react` + `@uploadkitdev/core`.
 */
export const initRemix: InitImpl = async (ctx, getSession) => {
  const { root, flags, detection } = ctx;

  const rootAbs = join(root, REL_ROOT);
  const routeAbs = join(root, REL_ROUTE);
  const envAbs = join(root, REL_ENV);

  // --- (1) Precondition: root.tsx must exist ------------------------------
  if (!existsSync(rootAbs)) {
    throw new Error(
      `app/root.tsx not found at ${rootAbs}. Run uploadkit init from the project root.`,
    );
  }

  // --- (1b) Idempotency --------------------------------------------------
  // Content-based detection covers both marker-based (`uploadkit init`) and
  // marker-free (`create-uploadkit-app`) projects.
  const existingRoot = await readFile(rootAbs, 'utf8');
  const hasRoute = existsSync(routeAbs);
  const hasProvider = existingRoot.includes(REACT_MODULE);
  const hasEnvKey =
    existsSync(envAbs) &&
    (await readFile(envAbs, 'utf8')).includes('UPLOADKIT_API_KEY');

  // Fully configured — nothing to do.
  if (hasRoute && hasProvider && hasEnvKey) {
    return { skipped: true, installed: [], created: [], modified: [] };
  }

  // Partial repair: only apply missing pieces.
  const skipRoute = hasRoute;
  const skipProvider = hasProvider;
  const skipEnv = hasEnvKey;

  // Preconditions passed — open the backup session.
  const session = getSession();

  const created: string[] = [];
  const modified: string[] = [];

  // --- (2) Back up root.tsx ----------------------------------------------
  if (!skipProvider) {
    await session.save(rootAbs);
  }

  // --- (3) Rewrite root.tsx ----------------------------------------------
  if (!skipProvider) {
    const withImport = addImport(existingRoot, {
      from: REACT_MODULE,
      specifiers: [PROVIDER_LOCAL],
    });
    const wrapped = wrapChildrenOf(withImport, {
      parentTag: 'body',
      wrapperOpen: `<${PROVIDER_LOCAL} endpoint="/api/uploadkit">`,
      wrapperClose: `</${PROVIDER_LOCAL}>`,
    });
    if (wrapped !== existingRoot) {
      await writeFile(rootAbs, wrapped, 'utf8');
      modified.push(rootAbs);
    }
  }

  // --- (4) Create route handler ------------------------------------------
  if (!skipRoute) {
    const routeTemplate = await loadTemplate('remix-route.tsx.tpl');
    await writeIfAbsent(routeAbs, routeTemplate, session, created);
  }

  // --- (5) Merge .env -----------------------------------------------------
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

  // --- (6) Install packages ----------------------------------------------
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
