import { describe, it, expect, vi, beforeEach } from 'vitest';

// These tests verify the createUser event logic extracted into a testable helper.
// The actual Auth.js event wires this helper — we test the helper directly.

describe('createUser event — default project creation (D-07)', () => {
  it('creates "My First Project" when no project exists for user', async () => {
    // MISSING — implement after auth.ts is created
    expect(true).toBe(false); // intentionally red
  });

  it('skips creation if a project already exists (idempotency guard)', async () => {
    // MISSING — implement after auth.ts is created
    expect(true).toBe(false); // intentionally red
  });

  it('generates a unique slug with nanoid suffix', async () => {
    // MISSING — implement after auth.ts is created
    expect(true).toBe(false); // intentionally red
  });
});
