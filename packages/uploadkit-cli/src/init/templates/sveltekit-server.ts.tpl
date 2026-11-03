// uploadkit:start — do not edit this block manually
import type { RequestHandler } from '@sveltejs/kit';
// SvelteKit 3 deprecates `$env/*` (replacement: `$app/env/private`, which does
// not exist in SvelteKit 2) and no longer ships its types, but it still resolves
// at runtime in both majors, so the type error is silenced for compatibility.
// @ts-ignore
import { env } from '$env/dynamic/private';
import { createUploadKitHandler } from '@uploadkitdev/next';
import { ukRouter } from '../../../../lib/uploadkit';

/**
 * Catch-all UploadKit endpoint. `createUploadKitHandler` is a standard
 * Request -> Response handler, so it works in SvelteKit as-is. The API key is
 * read on the server only; the browser never sees it.
 *
 * Set UPLOADKIT_API_KEY in .env before you ship.
 */
const { GET: getRoute, POST: postRoute } = createUploadKitHandler({
  router: ukRouter,
  apiKey: env.UPLOADKIT_API_KEY,
});

// SvelteKit exposes `[...uploadkit]` as a "/"-joined string; the handler
// expects the segments as an array.
const toCtx = (uploadkit: string | undefined) => ({
  params: Promise.resolve({ uploadkit: (uploadkit ?? '').split('/').filter(Boolean) }),
});

export const GET: RequestHandler = ({ request, params }) =>
  getRoute(request, toCtx(params.uploadkit));
export const POST: RequestHandler = ({ request, params }) =>
  postRoute(request, toCtx(params.uploadkit));
// uploadkit:end
