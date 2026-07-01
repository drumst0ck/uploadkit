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
  migrate-supabase        Stream a Supabase Storage bucket into UploadKit
  rewrite-urls            Rewrite Supabase URLs to UploadKit URLs in files

${pc.bold('Common options')}
      --yes, -y           Accept all prompt defaults
      --skip-install      Skip dependency installation (init only)
      --target <path>     Target file for \`add\` (optional)
      --timestamp <iso>   Backup timestamp to restore (restore only)
      --latest            Restore the newest backup session, then archive
                          it to .uploadkit-backup/.applied/ so the next
                          --latest picks the previous session (restore only)
  -v, --version           Print version
  -h, --help              Print this help

${pc.bold('migrate-supabase options')}
      --supabase-url <url>     Or env: SUPABASE_URL
      --supabase-key <key>    ${pc.red('service_role key — bypasses RLS')} (env: SUPABASE_SERVICE_ROLE_KEY)
      --supabase-bucket <id>  Bucket to migrate (env: SUPABASE_BUCKET)
      --uploadkit-key <key>   UploadKit API key (env: UPLOADKIT_API_KEY)
      --uploadkit-route <s>   Target route slug (env: UPLOADKIT_ROUTE, default: default)
      --uploadkit-api <url>   Override API base URL (env: UPLOADKIT_API_URL)
      --prefix <prefix>       Only migrate objects under this prefix
      --concurrency <n>       Parallel uploads (default: 4)
      --out <path>            Mapping JSON path (default: ./uploadkit-migration-<ts>.json)
      --resume <path>         Resume from existing mapping file
      --dry-run               List without uploading

${pc.bold('rewrite-urls options')}
      --mapping <path>   JSON file produced by \`migrate-supabase\`
      --glob <pattern>   Files to scan (e.g. "src/**/*.{ts,tsx,md}")
      --dry-run          Report only, no writes

${pc.bold('Docs')}   https://uploadkit.dev/docs/guides/cli-existing-projects
`;

export function printHelp(): void {
  process.stdout.write(`${HELP_TEXT}\n`);
}
