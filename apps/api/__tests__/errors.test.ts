import { describe, it } from 'vitest';
// Tests will be filled in by Task 2 implementation
// Scaffold marks this file as the expected test location

describe('serializeError', () => {
  it.todo('maps UploadKitError to Stripe-style { error: { type, code, message } }');
  it.todo('returns 500 with generic message for unknown errors');
  it.todo('maps 401 statusCode to authentication_error type');
  it.todo('maps 429 statusCode to rate_limit_error type');
  it.todo('includes suggestion field when present');
});

describe('serializeValidationError', () => {
  it.todo('maps Zod fieldErrors to details field');
  it.todo('returns 400 status with VALIDATION_ERROR code');
});
