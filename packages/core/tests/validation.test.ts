import { describe, it, expect } from 'vitest';
import { validateFile } from '../src/validation';
import { UploadKitError } from '@uploadkitdev/shared';

// Helper to create a File with specific properties
function makeFile(
  name: string,
  type: string,
  sizeBytes: number,
): File {
  const buf = new Uint8Array(Math.min(sizeBytes, 10)).fill(0);
  const file = new File([buf], name, { type });
  // Override size to simulate large files without allocating memory
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

describe('validateFile', () => {
  it('accepts a valid file within size and type constraints', () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 1024 * 1024); // 1MB

    expect(() =>
      validateFile(file, {
        maxFileSize: 4 * 1024 * 1024, // 4MB
        allowedTypes: ['image/jpeg', 'image/png'],
      }),
    ).not.toThrow();
  });

  it('rejects a file exceeding maxFileSize', () => {
    const file = makeFile('bigvideo.mp4', 'video/mp4', 10 * 1024 * 1024); // 10MB

    expect(() =>
      validateFile(file, { maxFileSize: 4 * 1024 * 1024 }),
    ).toThrow(UploadKitError);

    let caught: unknown;
    try {
      validateFile(file, { maxFileSize: 4 * 1024 * 1024 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toMatchObject({ code: 'FILE_TOO_LARGE' });
  });

  it('rejects a file with a disallowed MIME type', () => {
    const file = makeFile('script.exe', 'application/octet-stream', 512);

    let caught: unknown;
    try {
      validateFile(file, { allowedTypes: ['image/jpeg', 'image/png'] });
    } catch (e) {
      caught = e;
    }
    expect(caught).toMatchObject({ code: 'INVALID_FILE_TYPE' });
  });

  it('accepts a file when no type restrictions are set (allowedTypes undefined)', () => {
    const file = makeFile('data.bin', 'application/octet-stream', 512);

    // No restrictions — anything is allowed
    expect(() => validateFile(file, { maxFileSize: 1024 * 1024 })).not.toThrow();
    expect(() => validateFile(file, {})).not.toThrow();
    expect(() => validateFile(file, undefined)).not.toThrow();
  });

  it('accepts a file when allowedTypes is an empty array (no restriction)', () => {
    const file = makeFile('data.bin', 'application/octet-stream', 512);

    expect(() =>
      validateFile(file, { allowedTypes: [] }),
    ).not.toThrow();
  });

  it('supports glob-style MIME type patterns (e.g., "image/*")', () => {
    const jpeg = makeFile('photo.jpg', 'image/jpeg', 512);
    const png = makeFile('image.png', 'image/png', 512);
    const pdf = makeFile('doc.pdf', 'application/pdf', 512);

    // Both image/* variants are accepted
    expect(() => validateFile(jpeg, { allowedTypes: ['image/*'] })).not.toThrow();
    expect(() => validateFile(png, { allowedTypes: ['image/*'] })).not.toThrow();

    // PDF is rejected
    expect(() => validateFile(pdf, { allowedTypes: ['image/*'] })).toThrow(UploadKitError);
  });
});
