// uploadkit:start — do not edit this block manually
/**
 * WARNING: Vite + React is a client-only framework. UploadKit requires a
 * server to sign requests with your API key. For production use, either:
 *
 *   1) Pair this app with a backend (Hono, Express, Cloudflare Workers) that
 *      exposes an UploadKit endpoint at e.g. /api/uploadkit, OR
 *   2) Use BYOS (Bring Your Own Storage) with server-side presigned URLs.
 *
 * See https://uploadkit.dev/docs/vite for the full guide.
 */
export const UPLOADKIT_ENDPOINT = import.meta.env.VITE_UPLOADKIT_ENDPOINT ?? '/api/uploadkit';
// uploadkit:end
