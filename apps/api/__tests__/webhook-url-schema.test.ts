import { describe, it, expect } from 'vitest';
import { CreateFileRouterSchema, UpdateFileRouterSchema } from '@/lib/schemas';

const bad = [
  'http://example.com/hook',
  'https://user:pass@example.com/hook',
  'https://127.0.0.1/hook',
  'https://[::1]/hook',
  'https://localhost/hook',
  'https://metadata.internal/hook',
  `https://example.com/${'a'.repeat(2050)}`,
];

describe('file router webhookUrl validation', () => {
  it.each(bad.map((u) => [u.slice(0, 40), u]))('rejects %s on create and update', (_label, webhookUrl) => {
    expect(CreateFileRouterSchema.safeParse({ slug: 'images', webhookUrl }).success).toBe(false);
    expect(UpdateFileRouterSchema.safeParse({ webhookUrl }).success).toBe(false);
  });

  it('accepts a public https URL and still allows clearing it on update', () => {
    expect(CreateFileRouterSchema.safeParse({ slug: 'images', webhookUrl: 'https://hooks.example.com/u' }).success).toBe(true);
    expect(UpdateFileRouterSchema.safeParse({ webhookUrl: 'https://hooks.example.com/u' }).success).toBe(true);
    expect(UpdateFileRouterSchema.safeParse({ webhookUrl: null }).success).toBe(true);
    expect(CreateFileRouterSchema.safeParse({ slug: 'images' }).success).toBe(true);
  });
});
