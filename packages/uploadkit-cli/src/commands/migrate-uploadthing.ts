import pc from 'picocolors';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { ParsedArgs } from '../args.js';

/**
 * Generates UploadKit config from UploadThing env vars.
 * Reads UPLOADTHING_SECRET / UPLOADTHING_APP_ID and writes lib/uploadkit.ts.
 */
export async function run(_parsed: ParsedArgs): Promise<number> {
  const cwd = process.cwd();
  const envPath = join(cwd, '.env.local');
  const outPath = join(cwd, 'lib', 'uploadkit.ts');

  let envContent = '';
  try {
    envContent = await readFile(envPath, 'utf8');
  } catch {
    process.stderr.write(
      `${pc.yellow('warn')} No .env.local found — create one with UPLOADTHING_SECRET and UPLOADTHING_APP_ID.\n`,
    );
  }

  const secret = envContent.match(/UPLOADTHING_SECRET=(.+)/)?.[1]?.trim();
  const appId = envContent.match(/UPLOADTHING_APP_ID=(.+)/)?.[1]?.trim();

  const snippet = `import { createUploadKitHandler, createFileRouter } from '@uploadkitdev/next';

// Migrated from UploadThing (appId: ${appId ?? 'unknown'})
// 1. Create a project at https://app.uploadkit.dev
// 2. Replace the API key below
// 3. Map your UploadThing routes in fileRouter

export const fileRouter = createFileRouter({
  default: {
    maxFileSize: '4MB',
    maxFileCount: 1,
  },
});

export const { GET, POST } = createUploadKitHandler({
  router: fileRouter,
  apiKey: process.env.UPLOADKIT_API_KEY ?? '${secret ? 'uk_test_migrated' : 'uk_test_xxx'}',
});
`;

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, snippet, 'utf8');

  process.stdout.write(
    `${pc.green('✓')} Wrote ${pc.cyan('lib/uploadkit.ts')}\n` +
      `${pc.dim('Next: set UPLOADKIT_API_KEY in .env.local and map your routes.')}\n`,
  );

  return 0;
}
