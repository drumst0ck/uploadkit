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

  const snippet = `import { createUploadKitHandler, type FileRouter } from '@uploadkitdev/next';

// Migrated from UploadThing (appId: ${appId ?? 'unknown'})
// 1. Create a project at https://app.uploadkit.dev
// 2. Replace the API key below
// 3. Map your UploadThing routes in fileRouter

export const fileRouter = {
  default: {
    maxFileSize: '4MB',
    maxFileCount: 1,
  },
} satisfies FileRouter;

export const { GET, POST } = createUploadKitHandler({
  router: fileRouter,
  apiKey: process.env.UPLOADKIT_API_KEY ?? '${secret ? 'uk_test_migrated' : 'uk_test_xxx'}',
});
`;

  await mkdir(dirname(outPath), { recursive: true });
  try {
    // Exclusive creation also protects against a file appearing after a check.
    await writeFile(outPath, snippet, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    process.stderr.write(
      `${pc.red('error')} lib/uploadkit.ts already exists — keeping your file. Move it aside before migrating.\n`,
    );
    return 1;
  }

  process.stdout.write(
    `${pc.green('✓')} Wrote ${pc.cyan('lib/uploadkit.ts')}\n` +
      `${pc.dim('Next: set UPLOADKIT_API_KEY in .env.local and map your routes.')}\n`,
  );

  return 0;
}
