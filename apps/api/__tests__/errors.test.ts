import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { UploadKitError, UnauthorizedError, RateLimitError } from '@uploadkit/shared';
import { serializeError, serializeValidationError } from '@/lib/errors';

describe('serializeError', () => {
  it('maps UploadKitError to Stripe-style { error: { type, code, message } }', async () => {
    const err = new UploadKitError('TEST_CODE', 'Something went wrong', 400);
    const res = serializeError(err);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.type).toBe('invalid_request');
    expect(body.error.code).toBe('TEST_CODE');
    expect(body.error.message).toBe('Something went wrong');
  });

  it('returns 500 with generic message for unknown errors', async () => {
    const err = new Error('Something totally unexpected');
    const res = serializeError(err);
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error.type).toBe('api_error');
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('An unexpected error occurred');
  });

  it('maps 401 statusCode to authentication_error type', async () => {
    const err = new UnauthorizedError();
    const res = serializeError(err);
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error.type).toBe('authentication_error');
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('maps 429 statusCode to rate_limit_error type', async () => {
    const err = new RateLimitError(30);
    const res = serializeError(err);
    const body = await res.json();
    expect(res.status).toBe(429);
    expect(body.error.type).toBe('rate_limit_error');
    expect(body.error.code).toBe('RATE_LIMITED');
  });

  it('includes suggestion field when present', async () => {
    const err = new UnauthorizedError();
    const res = serializeError(err);
    const body = await res.json();
    expect(body.error.suggestion).toBe('Check your API key at app.uploadkit.dev');
  });
});

describe('serializeValidationError', () => {
  it('maps Zod fieldErrors to details field', async () => {
    const schema = z.object({ name: z.string().min(1), size: z.number().positive() });
    const result = schema.safeParse({ name: '', size: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const res = serializeValidationError(result.error);
      const body = await res.json();
      expect(body.error.details).toBeDefined();
      expect(body.error.details.name).toBeDefined();
      expect(body.error.details.size).toBeDefined();
    }
  });

  it('returns 400 status with VALIDATION_ERROR code', async () => {
    const schema = z.object({ foo: z.string() });
    const result = schema.safeParse({ foo: 123 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const res = serializeValidationError(result.error);
      const body = await res.json();
      expect(res.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.type).toBe('invalid_request');
    }
  });
});
