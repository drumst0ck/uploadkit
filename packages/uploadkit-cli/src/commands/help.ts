import pc from 'picocolors';
import { VERSION } from '../version.js';

export const HELP_TEXT = `
${pc.bold('uploadkit')} ${pc.dim(VERSION)} — install UploadKit into an existing project

${pc.bold('Usage')}
  $ uploadkit <command> [options]

${pc.bold('Commands')}
  init                    Wire UploadKit into the current project
  add <component>         Add a UploadKit React component to this project
  restore                 Roll back a previous \`init\` or \`add\` run

${pc.bold('Options')}
      --yes, -y           Accept all prompt defaults
      --skip-install      Skip dependency installation (init only)
      --target <path>     Target file for \`add\` (optional)
      --timestamp <iso>   Backup timestamp to restore (restore only)
  -v, --version           Print version
  -h, --help              Print this help

${pc.bold('Docs')}   https://uploadkit.dev/docs/guides/cli-existing-projects
`;

export function printHelp(): void {
  process.stdout.write(`${HELP_TEXT}\n`);
}
