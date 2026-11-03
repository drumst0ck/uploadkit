import { expect, it } from 'vitest';
import { generateReactHelpers } from '../src/helpers';
it('keeps the synchronous public helper API and returns real components and hook', () => {
  const helpers = generateReactHelpers<{ media: { maxFileSize: string } }>();
  expect(helpers).toHaveProperty('UploadButton');
  expect(helpers).toHaveProperty('UploadDropzone');
  expect(helpers).toHaveProperty('UploadModal');
  expect(typeof helpers.useUploadKit).toBe('function');
});
