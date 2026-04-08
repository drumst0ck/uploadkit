import { describe, it } from 'vitest';
// Tests will be filled in by Task 2 implementation

describe('withApiKey', () => {
  it.todo('returns 401 when Authorization header is missing');
  it.todo('returns 401 when Bearer token format is invalid');
  it.todo('returns 429 when rate limit is exceeded');
  it.todo('returns 401 when API key hash is not found in DB');
  it.todo('returns 401 when API key is revoked (revokedAt set)');
  it.todo('calls handler with ApiContext when key is valid');
});
