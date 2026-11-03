import { describe, it, expect } from 'vitest';
import { validateWebhookUrl } from '../src/webhook-url';

describe('validateWebhookUrl', () => {
  it('accepts public https URLs', () => {
    expect(validateWebhookUrl('https://hooks.example.com/uploadkit?x=1')).toBeNull();
  });
  it.each([
    'http://example.com/hook',
    'ftp://example.com',
    'javascript:alert(1)',
    'not a url',
    'https://localhost/hook',
    'https://foo.localhost/hook',
    'https://127.0.0.1/hook',
    'https://10.0.0.5/hook',
    'https://192.168.1.1/hook',
    'https://169.254.169.254/latest',
    'https://[::1]/hook',
    'https://8.8.8.8/hook',
    'https://intranet.internal/hook',
    'https://user:pw@example.com/hook',
  ])('rejects %s', (url) => {
    expect(validateWebhookUrl(url)).not.toBeNull();
  });
  it('rejects overlong URLs', () => {
    expect(validateWebhookUrl(`https://example.com/${'a'.repeat(2100)}`)).not.toBeNull();
  });
});
