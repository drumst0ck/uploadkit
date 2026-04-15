import pc from 'picocolors';
import type { ParsedArgs } from '../args.js';

/**
 * Placeholder for `uploadkit restore`. Implemented in plan 12.5-07 using the
 * backup manifest format written by plan 12.5-03.
 */
export async function run(_parsed: ParsedArgs): Promise<number> {
  process.stdout.write(
    `${pc.cyan('[uploadkit]')} restore — not implemented yet (plan 12.5-07)\n`,
  );
  return 0;
}
