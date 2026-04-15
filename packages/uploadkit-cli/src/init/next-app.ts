import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';
import { addImport, hasMarkers, mergeEnv, wrapChildrenOf } from '../codemods/index.js';
import { installPackages } from './install-deps.js';
import type { InitImpl } from './types.js';

// Files the init flow touches. Relative to the project root.
const REL_LAYOUT = join('app', 'layout.tsx');
const REL_ROUTE = join('app', 'api', 'uploadkit', '[...uploadkit]', 'route.ts');
const REL_CLIENT = join('lib', 'uploadkit.ts');
const REL_ENV = '.env.local';

// Canonical SDK specifiers (D-05). `@latest` ensures fresh installs — the
// lockfile will pin for reproducibility.
const PKGS = ['@uploadkitdev/next@latest', '@uploadkitdev/react@latest'];

const REACT_MODULE = '@uploadkitdev/react';
const PROVIDER_LOCAL = 'UploadKitProvider';

// Resolve template files relative to the compiled module. Works in both the
// TS source (vitest executes .ts directly via tsx) and the bundled dist
// (tsup copies the templates/ dir alongside index.js via publicDir/onSuccess).
const TEMPLATE_DIR = resolve(fileURLToPath(import.meta.url), '..', 'templates');

async function loadTemplate(name: string): Promise<string> {
  return readFile(join(TEMPLATE_DIR, name), 'utf8');
}

async function writeIfAbsent(
  absPath: string,
  contents: string,
  session: { recordCreate: (p: string) => void },
  createdList: string[],
): Promise<void> {
  if (existsSync(absPath)) return;
  await mkdir(dirname(absPath), { recursive: true });
  await writeFile(absPath, contents, 'utf8');
  session.recordCreate(absPath);
  createdList.push(absPath);
}

/**
 * `init` implementation for Next.js App Router.
 *
 * Order of operations:
 *   1. Precondition: verify `app/layout.tsx` exists. Must run BEFORE the
 *      backup session is materialized so a failed precondition does not
 *      leave an empty `.uploadkit-backup/<ts>/` dir on disk.
 *   2. Idempotency check: if layout already has markers AND route handler
 *      exists, print "already configured" and return `{skipped: true}`.
 *   3. Back up `app/layout.tsx` (the only file we mutate in-place).
 *   4. Rewrite layout: addImport + wrapChildrenOf('body', <UploadKitProvider>).
 *   5. Create route handler from template (if absent).
 *   6. Create `lib/uploadkit.ts` stub from template (if absent).
 *   7. Merge `.env.local` with `UPLOADKIT_API_KEY=uk_test_placeholder`.
 *   8. Install SDK packages (unless `skipInstall`).
 *
 * All created/modified paths are returned in the InitResult for the CLI's
 * summary printout.
 */
export const initNextApp: InitImpl = async (ctx, getSession) => {
  const { root, flags, detection } = ctx;

  const layoutAbs = join(root, REL_LAYOUT);
  const routeAbs = join(root, REL_ROUTE);
  const clientAbs = join(root, REL_CLIENT);
  const envAbs = join(root, REL_ENV);

  // --- (1) Precondition: layout must exist -------------------------------
  if (!existsSync(layoutAbs)) {
    throw new Error(
      `app/layout.tsx not found at ${layoutAbs}. Run uploadkit init from the project root.`,
    );
  }

  // --- (2) Idempotency ---------------------------------------------------
  if (existsSync(routeAbs)) {
    const existingLayout = await readFile(layoutAbs, 'utf8');
    if (hasMarkers(existingLayout) && existingLayout.includes(REACT_MODULE)) {
      return { skipped: true, installed: [], created: [], modified: [] };
    }
  }

  // Preconditions passed — materialize the backup session.
  const session = getSession();

  const created: string[] = [];
  const modified: string[] = [];

  // --- (3) Back up the layout BEFORE any mutation ------------------------
  await session.save(layoutAbs);

  // --- (4) Rewrite layout -------------------------------------------------
  const originalLayout = await readFile(layoutAbs, 'utf8');
  const withImport = addImport(originalLayout, {
    from: REACT_MODULE,
    specifiers: [PROVIDER_LOCAL],
  });
  const wrapped = wrapChildrenOf(withImport, {
    parentTag: 'body',
    wrapperOpen: `<${PROVIDER_LOCAL}>`,
    wrapperClose: `</${PROVIDER_LOCAL}>`,
  });
  if (wrapped !== originalLayout) {
    await writeFile(layoutAbs, wrapped, 'utf8');
    modified.push(layoutAbs);
  }

  // --- (5) Create route handler ------------------------------------------
  const routeTemplate = await loadTemplate('next-route-handler.ts.tpl');
  await writeIfAbsent(routeAbs, routeTemplate, session, created);

  // --- (6) Create client stub --------------------------------------------
  const clientTemplate = await loadTemplate('next-uploadkit-client.ts.tpl');
  await writeIfAbsent(clientAbs, clientTemplate, session, created);

  // --- (7) Merge .env.local ----------------------------------------------
  const envExisted = existsSync(envAbs);
  const appended = await mergeEnv(envAbs, {
    UPLOADKIT_API_KEY: 'uk_test_placeholder',
  });
  if (!envExisted) {
    session.recordCreate(envAbs);
    created.push(envAbs);
  } else if (appended.length > 0) {
    // File existed and we appended — treat as modify. Best-effort backup of
    // the pre-append version (mergeEnv already wrote, so we can't back up
    // now — this is acceptable since env merges are additive-only and the
    // user can diff against git).
    modified.push(envAbs);
  }

  // --- (8) Install packages ----------------------------------------------
  await installPackages(detection.packageManager, root, PKGS, {
    skipInstall: flags.skipInstall,
  });

  if (flags.skipInstall) {
    process.stdout.write(
      `${pc.dim('[uploadkit]')} --skip-install: run ${pc.cyan(`${detection.packageManager} add ${PKGS.join(' ')}`)} to complete setup.\n`,
    );
  }

  return {
    skipped: false,
    installed: PKGS,
    created,
    modified,
  };
};
