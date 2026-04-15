import { relative } from 'node:path';
import pc from 'picocolors';
import type { ParsedArgs } from '../args.js';
import { detectFramework } from '../detect/index.js';
import type { Framework } from '../detect/types.js';
import { createBackupSession } from '../backup/backup.js';
import { COMPONENT_ALIASES, isComponentAlias, type ComponentAlias } from '../add/catalog.js';
import { promptForTargetFile } from '../add/prompt-target.js';
import { insertComponent } from '../add/insert-component.js';

/** Frameworks where `add` is supported (D-04). */
const SUPPORTED: Framework[] = ['next-app', 'remix', 'vite-react'];

function printCatalog(): void {
  process.stderr.write(`${pc.bold('Available components:')}\n`);
  for (const alias of COMPONENT_ALIASES) {
    process.stderr.write(`  - ${alias}\n`);
  }
}

/**
 * `uploadkit add <component>` entrypoint.
 *
 * Flow:
 *  1. Parse + validate alias against the catalog (D-09).
 *  2. Detect framework; refuse on sveltekit / next-pages / unknown.
 *  3. Resolve target file (via --target flag or interactive prompt).
 *  4. Open a backup session + run insertComponent.
 *  5. Print summary.
 */
export async function run(parsed: ParsedArgs): Promise<number> {
  const [aliasArg] = parsed.positional;

  if (!aliasArg) {
    process.stderr.write(
      `${pc.red('error')} Missing component name. Usage: ${pc.cyan('uploadkit add <component>')}\n`,
    );
    printCatalog();
    return 1;
  }

  if (!isComponentAlias(aliasArg)) {
    process.stderr.write(
      `${pc.red('error')} Unknown component: ${pc.bold(aliasArg)}\n`,
    );
    printCatalog();
    return 1;
  }
  const alias: ComponentAlias = aliasArg;

  const cwd = process.cwd();
  const detection = await detectFramework(cwd);

  if (detection.framework === 'sveltekit') {
    process.stderr.write(
      `${pc.yellow('[uploadkit]')} \`add\` supports React frameworks only — SvelteKit components aren't shipped yet. See https://uploadkit.dev/docs/guides/cli-existing-projects\n`,
    );
    return 1;
  }

  if (detection.framework === 'next-pages') {
    process.stderr.write(
      `${pc.yellow('[uploadkit]')} \`add\` requires Next.js App Router — Pages Router is not supported.\n`,
    );
    return 1;
  }

  if (detection.framework === 'unknown' || !SUPPORTED.includes(detection.framework)) {
    const reason = detection.reason ?? 'No supported framework detected.';
    process.stderr.write(`${pc.yellow('[uploadkit]')} Cannot add: ${reason}\n`);
    return 1;
  }

  let targetAbs: string | null;
  try {
    targetAbs = await promptForTargetFile({
      root: detection.root,
      framework: detection.framework,
      targetFlag: parsed.flags.target,
      yes: parsed.flags.yes,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${pc.red('error')} ${message}\n`);
    return 1;
  }

  if (!targetAbs) {
    process.stderr.write(`${pc.yellow('[uploadkit]')} Cancelled.\n`);
    return 1;
  }

  const session = createBackupSession(detection.root);
  try {
    const result = await insertComponent(targetAbs, alias, { session });
    if (result.skipped) {
      process.stdout.write(
        `${pc.yellow('[uploadkit]')} ${alias} already present in ${relative(detection.root, targetAbs)} — no changes made.\n`,
      );
      return 0;
    }
    await session.finalize();
    process.stdout.write(
      `${pc.green('✔')} Added ${pc.bold(alias)} to ${relative(detection.root, targetAbs)}\n`,
    );
    return 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${pc.red('error')} ${message}\n`);
    try {
      await session.finalize();
    } catch {
      // swallow
    }
    return 1;
  }
}
