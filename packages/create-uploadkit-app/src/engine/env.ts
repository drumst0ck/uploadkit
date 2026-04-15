import fsp from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';

const ENV_LOCAL_BODY = `# UploadKit — get a real key at https://uploadkit.dev/signup
UPLOADKIT_API_KEY=uk_test_placeholder
`;

/**
 * Write a `.env.local` with a placeholder API key + signup link to the given
 * project directory. Does NOT overwrite an existing `.env.local` so templates
 * that ship their own env file (e.g. with extra template-specific keys) win.
 */
export async function writeEnvLocal(projectDir: string): Promise<void> {
  const target = path.join(projectDir, '.env.local');
  if (fs.existsSync(target)) return;
  await fsp.writeFile(target, ENV_LOCAL_BODY);
}
