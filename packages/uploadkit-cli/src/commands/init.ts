import { relative } from 'node:path';
import pc from 'picocolors';
import type { ParsedArgs } from '../args.js';
import { detectFramework } from '../detect/index.js';
import type { Framework } from '../detect/types.js';
import { createBackupSession, type BackupSession } from '../backup/backup.js';
import type { InitContext, InitImpl, InitResult } from '../init/types.js';
import { initNextApp } from '../init/next-app.js';
import { initSvelteKit } from '../init/sveltekit.js';
import { initRemix } from '../init/remix.js';
import { initViteReact } from '../init/vite-react.js';

/**
 * Dispatch table mapping supported framework verdicts → per-framework init
 * implementation. All four supported frameworks are wired (12.5-04 + 12.5-05).
 */
const IMPLS: Partial<Record<Framework, InitImpl>> = {
  'next-app': initNextApp,
  sveltekit: initSvelteKit,
  remix: initRemix,
  'vite-react': initViteReact,
};

/**
 * Per-framework env instruction hint. Each init impl writes to a different
 * env filename, and Vite needs a `VITE_`-prefixed variable so it's exposed
 * to client code. Keeping this map here (not inside each init impl) means
 * the summary stays in sync even if future frameworks are added — the type
 * makes the exhaustiveness check explicit.
 */
function envHintFor(framework: Framework): { file: string; key: string } {
  switch (framework) {
    case 'next-app':
      return { file: '.env.local', key: 'UPLOADKIT_API_KEY' };
    case 'sveltekit':
    case 'remix':
      return { file: '.env', key: 'UPLOADKIT_API_KEY' };
    case 'vite-react':
      return { file: '.env', key: 'VITE_UPLOADKIT_API_KEY' };
    default:
      // Fallback for any unsupported/future framework — preserves the old
      // default rather than throwing (summary is a convenience, not a gate).
      return { file: '.env.local', key: 'UPLOADKIT_API_KEY' };
  }
}

function printSummary(
  result: InitResult,
  root: string,
  framework: Framework,
): void {
  if (result.skipped) {
    process.stdout.write(
      `${pc.yellow('[uploadkit]')} UploadKit already configured in this project — no changes made.\n`,
    );
    return;
  }

  const rel = (p: string): string => relative(root, p) || p;
  process.stdout.write(`\n${pc.green('✔')} UploadKit initialized\n`);
  if (result.created.length > 0) {
    process.stdout.write(`\n  ${pc.bold('created')}\n`);
    for (const f of result.created) process.stdout.write(`    + ${rel(f)}\n`);
  }
  if (result.modified.length > 0) {
    process.stdout.write(`\n  ${pc.bold('modified')}\n`);
    for (const f of result.modified) process.stdout.write(`    ~ ${rel(f)}\n`);
  }
  if (result.installed.length > 0) {
    process.stdout.write(`\n  ${pc.bold('installed')}\n`);
    for (const pkg of result.installed) process.stdout.write(`    • ${pkg}\n`);
  }
  const hint = envHintFor(framework);
  process.stdout.write(
    `\n${pc.dim('Next steps:')} set ${pc.cyan(hint.key)} in ${pc.cyan(hint.file)}, then start your dev server.\n`,
  );
}

/**
 * `uploadkit init` — detect the host framework and wire UploadKit in.
 *
 * Flow: detect → refuse unsupported → open backup session → dispatch to the
 * per-framework impl → finalize session → print summary.
 */
export async function run(parsed: ParsedArgs): Promise<number> {
  const cwd = process.cwd();
  const detection = await detectFramework(cwd);

  // Refuse paths: print reason, exit 1, never mutate anything.
  if (detection.framework === 'unknown' || detection.framework === 'next-pages') {
    const reason = detection.reason ?? 'Unsupported project layout.';
    process.stderr.write(
      `${pc.yellow('[uploadkit]')} Cannot initialize: ${reason}\n`,
    );
    return 1;
  }

  const impl = IMPLS[detection.framework];
  if (!impl) {
    process.stderr.write(
      `${pc.yellow('[uploadkit]')} ${detection.framework} support is coming in a future release (plan 12.5-05).\n`,
    );
    return 1;
  }

  const ctx: InitContext = {
    detection,
    root: detection.root,
    flags: {
      yes: parsed.flags.yes,
      skipInstall: parsed.flags.skipInstall,
    },
  };

  // Lazy session: the impl calls getSession() only AFTER its preconditions
  // have passed. This prevents an empty `.uploadkit-backup/<ts>/manifest.json`
  // from being left behind when init aborts early (e.g. missing layout file).
  // `sessionRef.current` is mutated inside the closure; reading back via the
  // ref keeps TS's control-flow analysis sound across the await boundary.
  const sessionRef: { current: BackupSession | null } = { current: null };
  const getSession = (): BackupSession => {
    if (!sessionRef.current) {
      sessionRef.current = createBackupSession(detection.root);
    }
    return sessionRef.current;
  };

  try {
    const result = await impl(ctx, getSession);
    const opened = sessionRef.current;
    if (!result.skipped && opened) {
      await opened.finalize();
    }
    printSummary(result, detection.root, detection.framework);
    return 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${pc.red('error')} ${message}\n`);
    // Best-effort: finalize the manifest so partial backups are still
    // restorable — but only if the impl actually opened a session. Failures
    // before the first getSession() leave the ref null so no empty backup
    // dir gets written.
    const opened = sessionRef.current;
    if (opened) {
      try {
        await opened.finalize();
        process.stderr.write(
          `${pc.dim('A partial backup was saved to')} ${relative(detection.root, opened.dir)}\n`,
        );
      } catch {
        // swallow — original error is the important one
      }
    }
    return 1;
  }
}
