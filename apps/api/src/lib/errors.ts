import { UploadKitError } from '@uploadkitdev/shared';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const ERROR_TYPE_MAP: Record<number, string> = {
  400: 'invalid_request',
  401: 'authentication_error',
  403: 'invalid_request',
  404: 'invalid_request',
  409: 'invalid_request',
  422: 'invalid_request',
  429: 'rate_limit_error',
  500: 'api_error',
};

/**
 * Serialize any error to Stripe-style JSON response.
 * Retryability contract (UPLD-07):
 *   - 5xx and 429 are retryable — SDK will retry automatically
 *   - 4xx (except 429) are non-retryable — SDK surfaces as user errors immediately
 */
export function serializeError(err: unknown): NextResponse {
  if (typeof err === 'object' && err !== null && 'code' in err && err.code === 11000
    && 'keyPattern' in err && typeof err.keyPattern === 'object' && err.keyPattern !== null
    && 'customCdnDomain' in err.keyPattern) {
    return serializeError(new UploadKitError('CDN_DOMAIN_IN_USE', 'This CDN domain is already assigned to a project', 409));
  }
  if (err instanceof UploadKitError) {
    return NextResponse.json(
      {
        error: {
          type: ERROR_TYPE_MAP[err.statusCode] ?? 'api_error',
          code: err.code,
          message: err.message,
          ...(err.suggestion ? { suggestion: err.suggestion } : {}),
        },
      },
      { status: err.statusCode },
    );
  }
  console.error('Unhandled error:', err);
  return NextResponse.json(
    { error: { type: 'api_error', code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
    { status: 500 },
  );
}

/** Distinguish malformed client JSON from internal SyntaxErrors. */
export async function readJson(req: { json(): Promise<unknown> }): Promise<unknown> {
  try {
    return await req.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new UploadKitError('INVALID_JSON', 'Request body must contain valid JSON', 400);
    }
    throw error;
  }
}

/**
 * Serialize a Zod validation error to Stripe-style JSON with fieldErrors details.
 */
export function serializeValidationError(zodError: z.ZodError): NextResponse {
  return NextResponse.json(
    {
      error: {
        type: 'invalid_request',
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: zodError.flatten().fieldErrors,
      },
    },
    { status: 400 },
  );
}
