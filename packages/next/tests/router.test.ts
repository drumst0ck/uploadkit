import { describe, it, expect } from 'vitest';
import { parseFileSize } from '../src/router';

describe('parseFileSize', () => {
  it('converts "4MB" to 4194304', () => {
    expect(parseFileSize('4MB')).toBe(4194304);
  });

  it('converts "16MB" to 16777216', () => {
    expect(parseFileSize('16MB')).toBe(16777216);
  });

  it('converts "1GB" to 1073741824', () => {
    expect(parseFileSize('1GB')).toBe(1073741824);
  });

  it('converts "512KB" to 524288', () => {
    expect(parseFileSize('512KB')).toBe(524288);
  });

  it('passes through a number as-is', () => {
    expect(parseFileSize(5000)).toBe(5000);
  });

  it('handles lowercase suffix "mb"', () => {
    expect(parseFileSize('4mb')).toBe(4194304);
  });

  it('handles "100MB"', () => {
    expect(parseFileSize('100MB')).toBe(104857600);
  });
});
