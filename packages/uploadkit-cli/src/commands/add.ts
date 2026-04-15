import pc from 'picocolors';
import type { ParsedArgs } from '../args.js';

/**
 * Placeholder for `uploadkit add <component>`. The real flow is implemented
 * in plan 12.5-06 and uses the component catalog from D-09.
 */
export async function run(_parsed: ParsedArgs): Promise<number> {
  process.stdout.write(
    `${pc.cyan('[uploadkit]')} add — not implemented yet (plan 12.5-06)\n`,
  );
  return 0;
}
