// uploadkit:start — do not edit this block manually
import { createUploadKit } from '@uploadkitdev/core';
import { env } from '$env/dynamic/private';

/**
 * Server-side UploadKit client. Reads the API key from `$env/dynamic/private`
 * so it's never exposed to the browser. Import from `$lib/uploadkit` in your
 * route handlers only.
 *
 * See https://uploadkit.dev/docs for the full API.
 */
export const uploadkit = createUploadKit({
  apiKey: env.UPLOADKIT_API_KEY ?? '',
});
// uploadkit:end
