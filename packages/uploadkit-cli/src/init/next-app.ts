import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';
import { addImport, hasMarkers, mergeEnv, wrapChildrenOf } from '../codemods/index.js';
import { installPackages } from './install-deps.js';
import type { InitImpl } from './types.js';

// Next.js supports two canonical App Router layouts: `app/` at the project
// root OR `src/app/` (the Next.js CLI defaults to `src/` when opted in).
// We probe both at runtime and thread the chosen base dir through every
// subsequent path (route handler, client stub).
const REL_ENV = '.env.local';

/**
 * Probe for a Next.js App Router root layout and return the base app dir
 * (`app` or `src/app`) where it was found, or `null` if neither exists.
 * Precedence order matters: `app/` wins over `src/app/` for projects that
 * explicitly use the top-level layout but also happen to have a `src/` dir.
 */
function resolveBaseAppDir(root: string): string | null {
  if (existsSync(join(root, 'app', 'layout.tsx'))) return 'app';
  if (existsSync(join(root, 'src', 'app', 'layout.tsx'))) return join('src', 'app');
  return null;
}

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
 *   1. Precondition: locate the root layout at either `app/layout.tsx` or
 *      `src/app/layout.tsx`. If neither exists, throw before any backup
 *      session is materialized (prevents empty backup dirs on early abort).
 *   2. Idempotency check: if layout already has markers AND route handler
 *      exists, print "already configured" and return `{skipped: true}`.
 *   3. Back up the discovered layout (the only file we mutate in-place).
 *   4. Rewrite layout: addImport + wrapChildrenOf('body', <UploadKitProvider>).
 *   5. Create route handler from template (if absent) under the same
 *      `<baseAppDir>/api/uploadkit/[...uploadkit]/route.ts` location.
 *   6. Create `lib/uploadkit.ts` stub (or `src/lib/uploadkit.ts` when the
 *      project uses the `src/` layout) from template (if absent).
 *   7. Merge `.env.local` with `UPLOADKIT_API_KEY=uk_test_placeholder`.
 *   8. Install SDK packages (unless `skipInstall`).
 *
 * All created/modified paths are returned in the InitResult for the CLI's
 * summary printout.
 */
export const initNextApp: InitImpl = async (ctx, getSession) => {
  const { root, flags, detection } = ctx;

  // --- (1) Precondition: locate layout ------------------------------------
  const baseAppDir = resolveBaseAppDir(root);
  if (!baseAppDir) {
    throw new Error(
      `layout.tsx not found at ${join(root, 'app', 'layout.tsx')} or ${join(root, 'src', 'app', 'layout.tsx')}. Run uploadkit init from the project root.`,
    );
  }

  const layoutAbs = join(root, baseAppDir, 'layout.tsx');
  const routeAbs = join(
    root,
    baseAppDir,
    'api',
    'uploadkit',
    '[...uploadkit]',
    'route.ts',
  );
  // Client stub: when the project uses `src/app`, keep the stub inside `src/`
  // too so imports resolve naturally through the user's tsconfig path alias.
  const clientAbs =
    baseAppDir === 'app'
      ? join(root, 'lib', 'uploadkit.ts')
      : join(root, 'src', 'lib', 'uploadkit.ts');
  const envAbs = join(root, REL_ENV);

  // --- (2) Idempotency ----------------------------------------------------
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
