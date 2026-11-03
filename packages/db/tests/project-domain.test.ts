import { describe, expect, it } from 'vitest';
import { Project } from '../src/models/project';

describe('exclusive custom CDN hostnames', () => {
  it('declares a unique hostname index limited to string values', () => {
    expect(Project.schema.indexes()).toContainEqual([
      { customCdnDomain: 1 }, expect.objectContaining({ unique: true, partialFilterExpression: { customCdnDomain: { $type: 'string' } } }),
    ]);
  });
  it('normalizes DNS names and omits cleared values from the hostname index', () => {
    expect(new Project({ customCdnDomain: ' CDN.Example.COM ' }).customCdnDomain).toBe('cdn.example.com');
    expect(new Project({ customCdnDomain: '' }).customCdnDomain).toBeUndefined();
    expect(new Project({ customCdnDomain: null }).customCdnDomain).toBeUndefined();
  });
});
