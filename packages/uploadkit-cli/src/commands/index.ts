import pc from 'picocolors';
import type { ParsedArgs } from '../args.js';
import * as init from './init.js';
import * as add from './add.js';
import * as restore from './restore.js';

export type CommandHandler = (parsed: ParsedArgs) => Promise<number>;

/**
 * Subcommand dispatch table. Each handler returns an exit code so `dispatch`
 * can remain pure — callers (tests and `src/index.ts`) decide whether to
 * actually call `process.exit`.
 */
export const handlers: Readonly<Record<string, CommandHandler>> = {
  init: init.run,
  add: add.run,
  restore: restore.run,
};

/**
 * Route a parsed invocation to a handler. Unknown commands print a helpful
 * message to stderr and return exit code 1. The function never calls
 * `process.exit` directly — that is the entrypoint's job.
 */
export async function dispatch(parsed: ParsedArgs): Promise<number> {
  const { command } = parsed;
  if (!command) {
    // No command → caller should have shown help already. Treat as error
    // so we don't silently succeed when someone types `uploadkit` alone.
    process.stderr.write(
      `${pc.red('error')} No command provided. Run \`uploadkit --help\` for usage.\n`,
    );
    return 1;
  }

  const handler = handlers[command];
  if (!handler) {
    process.stderr.write(
      `${pc.red('error')} Unknown command: ${command}\nRun \`uploadkit --help\` for usage.\n`,
    );
    return 1;
  }

  return handler(parsed);
}
