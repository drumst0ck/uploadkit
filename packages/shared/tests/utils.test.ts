import { describe, it, expect } from 'vitest';
import { formatBytes, generateId, slugify } from '../src/utils';
import { UploadKitError } from '../src/errors';
import { TIERS, FILE_STATUSES, TIER_LIMITS } from '../src/constants';

describe('formatBytes', () => {
  it('returns "0 Bytes" for 0', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('returns "1 KB" for 1024', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('returns "1 MB" for 1048576', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
  });

  it('returns "1 GB" for 1073741824', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
  });
});

describe('generateId', () => {
  it('returns a string of length 21 by default', () => {
    expect(generateId()).toHaveLength(21);
  });

  it('returns a string of custom length', () => {
    expect(generateId(10)).toHaveLength(10);
  });
});

describe('slugify', () => {
  it('converts "My Project Name" to "my-project-name"', () => {
    expect(slugify('My Project Name')).toBe('my-project-name');
  });

  it('converts "Hello  World!!" to "hello-world"', () => {
    expect(slugify('Hello  World!!')).toBe('hello-world');
  });
});

describe('UploadKitError', () => {
  it('has the correct code and message', () => {
    const err = new UploadKitError('NOT_FOUND', 'File not found');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('File not found');
  });

  it('is an instance of Error', () => {
    const err = new UploadKitError('NOT_FOUND', 'File not found');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('TIERS', () => {
  it('contains all four tier values', () => {
    expect(TIERS).toContain('FREE');
    expect(TIERS).toContain('PRO');
    expect(TIERS).toContain('TEAM');
    expect(TIERS).toContain('ENTERPRISE');
  });
});

describe('FILE_STATUSES', () => {
  it('contains all four file status values', () => {
    expect(FILE_STATUSES).toContain('UPLOADING');
    expect(FILE_STATUSES).toContain('UPLOADED');
    expect(FILE_STATUSES).toContain('FAILED');
    expect(FILE_STATUSES).toContain('DELETED');
  });
});

describe('TIER_LIMITS', () => {
  it('FREE.maxStorageBytes equals 5GB', () => {
    expect(TIER_LIMITS.FREE.maxStorageBytes).toBe(5 * 1024 * 1024 * 1024);
  });

  it('FREE.maxFileSizeBytes equals 4MB', () => {
    expect(TIER_LIMITS.FREE.maxFileSizeBytes).toBe(4 * 1024 * 1024);
  });

  it('PRO.maxStorageBytes equals 100GB', () => {
    expect(TIER_LIMITS.PRO.maxStorageBytes).toBe(100 * 1024 * 1024 * 1024);
  });
});
