import * as p from '@clack/prompts';
import pc from 'picocolors';
import { parseArgs } from './args.js';
import { runPrompts, CancelledError, printCancelled } from './prompts.js';
import { VERSION } from './version.js';
import { TEMPLATE_IDS } from './types.js';

export const TEMPLATES = TEMPLATE_IDS;

export const HELP_TEXT = `
${pc.bold('create-uploadkit-app')} — scaffold a new project with UploadKit

${pc.bold('Usage')}
  $ create-uploadkit-app [project-name] [options]

${pc.bold('Templates')}
  next        Next.js 16 (App Router) + Tailwind v4 + @uploadkitdev/next
  sveltekit   SvelteKit with Svelte 5 + presigned-URL endpoint
  remix       React Router v7 (framework mode) + @uploadkitdev/react
  vite        Vite + React 19 SPA (BYOS demo)

${pc.bold('Options')}
  -t, --template <name>   One of: next, sveltekit, remix, vite
      --pm <name>         One of: pnpm, npm, yarn, bun
      --ts / --no-ts      TypeScript toggle (only applies to the vite template)
      --no-install        Skip dependency install
      --no-git            Skip git init
      --force             Overwrite a non-empty target directory
  -y, --yes               Accept all defaults (requires a project name arg)
  -v, --version           Print version
  -h, --help              Print this help

${pc.bold('Docs')}   https://uploadkit.dev
`;

export async function main(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);

  if (parsed.version) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  if (parsed.help) {
    process.stdout.write(`${HELP_TEXT}\n`);
    return 0;
  }

  if (parsed.errors.length > 0) {
    for (const err of parsed.errors) {
      process.stderr.write(`${pc.red('error')} ${err}\n`);
    }
    return 1;
  }

  p.intro(`${pc.cyan('create-uploadkit-app')} ${pc.dim(VERSION)}`);

  let options;
  try {
    options = await runPrompts(parsed);
  } catch (err) {
    if (err instanceof CancelledError) {
      printCancelled();
      return err.exitCode;
    }
    throw err;
  }

  // Wave 3 (plan 12-03) hands this to the template engine. Until then we
  // print the resolved options so the CLI is verifiable end-to-end.
  p.outro(`${pc.green('✓')} Resolved options`);
  process.stdout.write(`${JSON.stringify(options, null, 2)}\n`);

  return 0;
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
