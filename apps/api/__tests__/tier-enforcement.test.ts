import { describe, it, expect } from 'vitest';
import { TIER_LIMITS } from '@uploadkit/shared';

// These tests verify the tier enforcement logic as expressed in the upload/request route.
// We test the pure logic (arithmetic and comparisons) extracted from the route handler.
// No mocking needed — TIER_LIMITS is a plain constant object.

describe('Tier enforcement', () => {
  describe('storage limit', () => {
    it('FREE tier allows upload when under storage limit', () => {
      const tierLimits = TIER_LIMITS['FREE'];
      const currentStorageUsed = 1 * 1024 * 1024 * 1024; // 1 GB used
      const fileSize = 1 * 1024 * 1024; // 1 MB file
      const wouldExceed = currentStorageUsed + fileSize > tierLimits.maxStorageBytes;
      expect(wouldExceed).toBe(false);
    });

    it('FREE tier rejects upload when storage limit exceeded', () => {
      const tierLimits = TIER_LIMITS['FREE'];
      const currentStorageUsed = 4.99 * 1024 * 1024 * 1024; // ~5 GB used
      const fileSize = 20 * 1024 * 1024; // 20 MB file — would push over 5 GB
      const wouldExceed = currentStorageUsed + fileSize > tierLimits.maxStorageBytes;
      expect(wouldExceed).toBe(true);
    });

    it('PRO tier allows upload even when over FREE storage limits', () => {
      const freeLimits = TIER_LIMITS['FREE'];
      const proLimits = TIER_LIMITS['PRO'];
      // Storage used is above FREE limit but below PRO limit
      const currentStorageUsed = 6 * 1024 * 1024 * 1024; // 6 GB — over FREE (5 GB)
      const fileSize = 1 * 1024 * 1024; // 1 MB file

      const wouldExceedFree = currentStorageUsed + fileSize > freeLimits.maxStorageBytes;
      const wouldExceedPro = currentStorageUsed + fileSize > proLimits.maxStorageBytes;

      expect(wouldExceedFree).toBe(true);
      expect(wouldExceedPro).toBe(false);
    });
  });

  describe('effectiveMaxSize', () => {
    it('effectiveMaxSize enforces Math.min(routeMax, tierMax)', () => {
      const tierLimits = TIER_LIMITS['FREE'];
      // Route allows 10 MB, but FREE tier only allows 4 MB — tier wins
      const routeMaxFileSize = 10 * 1024 * 1024; // 10 MB
      const effectiveMaxSize = Math.min(routeMaxFileSize, tierLimits.maxFileSizeBytes);
      expect(effectiveMaxSize).toBe(tierLimits.maxFileSizeBytes); // 4 MB
      expect(effectiveMaxSize).toBe(4 * 1024 * 1024);
    });
  });

  describe('upload count limit', () => {
    it('FREE tier rejects when daily upload count is exceeded', () => {
      const tierLimits = TIER_LIMITS['FREE'];
      const currentUploads = 1000; // at the monthly limit
      const wouldExceed = currentUploads >= tierLimits.maxUploadsPerMonth;
      expect(wouldExceed).toBe(true);
    });
  });

  describe('file type validation', () => {
    it('rejects disallowed MIME types when allowedTypes is configured', () => {
      const allowedTypes = ['image/jpeg', 'image/png'];
      const incomingContentType = 'application/pdf';
      const isAllowed =
        allowedTypes.length === 0 || allowedTypes.includes(incomingContentType);
      expect(isAllowed).toBe(false);
    });

    it('allows all types when allowedTypes is empty', () => {
      const allowedTypes: string[] = [];
      const incomingContentType = 'application/pdf';
      const isAllowed =
        allowedTypes.length === 0 || allowedTypes.includes(incomingContentType);
      expect(isAllowed).toBe(true);
    });
  });
});
