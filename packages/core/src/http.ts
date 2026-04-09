import { UploadKitError } from '@uploadkit/shared';

interface FetchApiOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal | undefined;
}

/**
 * Typed fetch wrapper for the UploadKit REST API.
 * Sets Authorization: Bearer header. Never logs the apiKey.
 * On non-2xx responses, throws UploadKitError with code/message/statusCode from the error body.
 *
 * Security (T-04-01): API key is sent only in the Authorization header, never in URL or logs.
 * Security (T-04-02): Rejects http:// baseUrls — only https:// is permitted.
 */
export async function fetchApi<T>(
  baseUrl: string,
  apiKey: string,
  path: string,
  options: FetchApiOptions = {},
): Promise<T> {
  // T-04-02: Reject non-HTTPS base URLs to prevent credential leakage
  // Exception: localhost/127.0.0.1 are safe for development
  const isLocalhost = baseUrl.startsWith('http://localhost') || baseUrl.startsWith('http://127.0.0.1');
  if (baseUrl.startsWith('http://') && !isLocalhost) {
    throw new UploadKitError(
      'INSECURE_URL',
      'baseUrl must use HTTPS to protect your API key',
      400,
      'Update your UploadKit config to use https://',
    );
  }

  const { method = 'GET', body, signal } = options;
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    // T-04-01: API key in Authorization header only — never in URL or logs
    Authorization: `Bearer ${apiKey}`,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(signal ? { signal } : {}),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new UploadKitError('UPLOAD_ABORTED', 'Request was aborted', 0);
    }
    throw new UploadKitError(
      'NETWORK_ERROR',
      `Network request failed: ${err instanceof Error ? err.message : String(err)}`,
      0,
    );
  }

  if (!response.ok) {
    let errorBody: { error?: { code?: string; message?: string } } = {};
    try {
      errorBody = (await response.json()) as typeof errorBody;
    } catch {
      // ignore JSON parse failure — use defaults
    }
    const code = errorBody.error?.code ?? 'API_ERROR';
    const message = errorBody.error?.message ?? `Request failed with status ${response.status}`;
    throw new UploadKitError(code, message, response.status);
  }

  return response.json() as Promise<T>;
}
