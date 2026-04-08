import { UploadKitError } from '@uploadkit/shared';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const ERROR_TYPE_MAP: Record<number, string> = {
  400: 'invalid_request',
  401: 'authentication_error',
  403: 'invalid_request',
  404: 'invalid_request',
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
