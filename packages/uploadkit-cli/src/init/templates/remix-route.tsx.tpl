// uploadkit:start — do not edit this block manually
/**
 * Catch-all UploadKit endpoint for Remix / React Router v7.
 *
 * Proxies presign/multipart/list requests to the UploadKit API. The API key
 * is read from `process.env` so the browser never sees it.
 *
 * Set UPLOADKIT_API_KEY in .env before you ship.
 */
export async function action({ request }: { request: Request }) {
  const apiKey = process.env.UPLOADKIT_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'UPLOADKIT_API_KEY is not configured on the server.' },
      { status: 503 },
    );
  }
  // TODO: forward to your UploadKit client. See https://uploadkit.dev/docs
  return Response.json({ ok: true });
}

export async function loader({ request }: { request: Request }) {
  return action({ request });
}
// uploadkit:end
