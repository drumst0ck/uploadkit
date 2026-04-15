import mri from 'mri';
import pc from 'picocolors';
import { VERSION } from './version.js';

export const TEMPLATES = ['next', 'sveltekit', 'remix', 'vite'] as const;

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
      --no-install        Skip dependency install
  -y, --yes               Accept all defaults
  -v, --version           Print version
  -h, --help              Print this help

${pc.bold('Docs')}   https://uploadkit.dev
`;

export async function main(argv: string[]): Promise<number> {
  const args = mri(argv, {
    boolean: ['help', 'version', 'yes', 'install'],
    alias: { h: 'help', v: 'version', y: 'yes', t: 'template' },
    default: { install: true },
  });

  if (args.version) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  if (args.help) {
    process.stdout.write(`${HELP_TEXT}\n`);
    return 0;
  }

  process.stdout.write(
    `${pc.cyan('create-uploadkit-app')} ${pc.dim(VERSION)} — run again from Wave 2\n`,
  );
  return 0;
}

// Auto-run only when invoked as the CLI bin, not when imported by tests.
// `UPLOADKIT_CLI_SKIP_MAIN` lets test runners import this module safely.
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
