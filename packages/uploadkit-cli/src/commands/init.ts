import { relative } from 'node:path';
import pc from 'picocolors';
import type { ParsedArgs } from '../args.js';
import { detectFramework } from '../detect/index.js';
import type { Framework } from '../detect/types.js';
import { createBackupSession } from '../backup/backup.js';
import type { InitContext, InitImpl, InitResult } from '../init/types.js';
import { initNextApp } from '../init/next-app.js';

/**
 * Dispatch table mapping supported framework verdicts → per-framework init
 * implementation. Frameworks covered by plan 12.5-05 are left as `undefined`
 * and printed as "coming soon" until that plan lands.
 */
const IMPLS: Partial<Record<Framework, InitImpl>> = {
  'next-app': initNextApp,
};

function printSummary(result: InitResult, root: string): void {
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
  process.stdout.write(
    `\n${pc.dim('Next steps:')} set ${pc.cyan('UPLOADKIT_API_KEY')} in .env.local, then start your dev server.\n`,
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

  const session = createBackupSession(detection.root);

  try {
    const result = await impl(ctx, session);
    if (!result.skipped) {
      await session.finalize();
    }
    printSummary(result, detection.root);
    return 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${pc.red('error')} ${message}\n`);
    // Best-effort: finalize the manifest so partial backups are still restorable.
    try {
      await session.finalize();
      process.stderr.write(
        `${pc.dim('A partial backup was saved to')} ${relative(detection.root, session.dir)}\n`,
      );
    } catch {
      // swallow — original error is the important one
    }
    return 1;
  }
}
