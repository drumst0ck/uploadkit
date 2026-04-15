import pc from 'picocolors';
import type { ParsedArgs } from '../args.js';

/**
 * Placeholder for `uploadkit init`. The real flow is implemented across
 * plans 12.5-04 (Next.js reference) and 12.5-05 (SvelteKit/Remix/Vite).
 */
export async function run(_parsed: ParsedArgs): Promise<number> {
  process.stdout.write(
    `${pc.cyan('[uploadkit]')} init — not implemented yet (plan 12.5-04 / 12.5-05)\n`,
  );
  return 0;
}
