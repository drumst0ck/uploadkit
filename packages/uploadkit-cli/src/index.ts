import pc from 'picocolors';
import { parseArgs } from './args.js';
import { dispatch } from './commands/index.js';
import { printHelp } from './commands/help.js';
import { VERSION } from './version.js';

/**
 * CLI entrypoint. Kept small and testable: parse → branch on global flags →
 * dispatch. All real work lives in `commands/*`.
 */
export async function main(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);

  if (parsed.flags.version) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  if (parsed.flags.help || !parsed.command) {
    printHelp();
    // No command AND no explicit --help is still user-facing help output, but
    // we return 1 to flag that the user didn't tell us what to do — matches
    // the behaviour of `git` with no args and avoids silent success in CI.
    return parsed.flags.help ? 0 : 1;
  }

  return dispatch(parsed);
}

// Auto-run only when invoked as the CLI bin, not when imported by tests.
if (!process.env.UPLOADKIT_CLI_SKIP_MAIN) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exit(code);
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`${pc.red('error')} ${message}\n`);
      process.exit(1);
    });
}
