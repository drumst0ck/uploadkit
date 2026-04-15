// uploadkit:start — do not edit this block manually
import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { uploadkit } from '$lib/uploadkit';

/**
 * Catch-all UploadKit endpoint. Proxies presign/multipart/list requests
 * to the UploadKit API using the server-side API key so the browser
 * never sees the secret.
 *
 * Set UPLOADKIT_API_KEY in .env before you ship.
 */
async function handle(request: Request): Promise<Response> {
  const apiKey = env.UPLOADKIT_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'UPLOADKIT_API_KEY is not configured on the server.' },
      { status: 503 },
    );
  }

  // Forward the request body to UploadKit. The typed client is a thin
  // wrapper around fetch + presigned URL generation.
  const url = new URL(request.url);
  const subpath = url.pathname.replace(/^.*\/api\/uploadkit\/?/, '');

  return uploadkit.handle({ request, subpath });
}

export const GET: RequestHandler = ({ request }) => handle(request);
export const POST: RequestHandler = ({ request }) => handle(request);
// uploadkit:end
