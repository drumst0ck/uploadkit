import { describe, expect, it } from 'vitest';

describe('image transform worker validation', () => {
  it('honors explicit q=0 during automatic format negotiation', async () => {
    const { negotiateFormat } = await import('../src/index');
    expect(negotiateFormat('auto', 'image/avif;q=0, image/webp;q=0.8, image/*;q=0.5')).toBe('webp');
    expect(negotiateFormat('auto', 'image/avif;q=0.2, image/webp;q=0.9')).toBe('webp');
    expect(negotiateFormat('auto', 'image/avif;q=0, image/webp;q=0')).toBe('jpeg');
  });

  it('validates a correctly signed payload and rejects a modified one', async () => {
    const { verifySignature } = await import('../src/index');
    const secret = 'a-production-length-secret-for-tests';
    const payload = '123\neyJ3aWR0aCI6MzIwfQ\nproject/photo.jpg';
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
    const signature = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    await expect(verifySignature(secret, signature, payload)).resolves.toBe(true);
    await expect(verifySignature(secret, signature, `${payload}.changed`)).resolves.toBe(false);
    await expect(verifySignature(secret, '%not-base64%', payload)).resolves.toBe(false);
  });

  it('rejects invalid, unbounded transform options', async () => {
    const { decodeTransform } = await import('../src/index');
    const encoded = btoa(JSON.stringify({ width: 4097, fit: 'cover', quality: 85, format: 'webp' }))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(() => decodeTransform(encoded)).toThrow('INVALID_TRANSFORM_OPTIONS');
  });

  it('decodes readable recipes and keeps legacy Base64URL recipes working', async () => {
    const { decodeTransform } = await import('../src/index');
    expect(decodeTransform('w_480,h_320,fit_cover,q_78,f_webp')).toEqual({
      width: 480, height: 320, fit: 'cover', quality: 78, format: 'webp',
    });
    const legacy = btoa(JSON.stringify({
      width: 480, height: 320, fit: 'cover', quality: 78, format: 'webp',
    })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(decodeTransform(legacy)).toEqual({
      width: 480, height: 320, fit: 'cover', quality: 78, format: 'webp',
    });
  });

  it('rejects duplicate, unknown, or incomplete readable parameters', async () => {
    const { decodeTransform } = await import('../src/index');
    expect(() => decodeTransform('w_480,w_320,fit_cover,q_78,f_webp'))
      .toThrow('INVALID_TRANSFORM_OPTIONS');
    expect(() => decodeTransform('w_480,blur_2,fit_cover,q_78,f_webp'))
      .toThrow('INVALID_TRANSFORM_OPTIONS');
    expect(() => decodeTransform('w_480,fit_cover,f_webp'))
      .toThrow('INVALID_TRANSFORM_OPTIONS');
  });

  it('decodes nested object keys without allowing an empty key', async () => {
    const { parseTransformRequest } = await import('../src/index');
    expect(parseTransformRequest(new URL('https://cdn.uploadkit.dev/t/9999999999/sig/options/a/b.jpg')).key)
      .toBe('a/b.jpg');
    expect(() => parseTransformRequest(new URL('https://cdn.uploadkit.dev/t/9999999999/sig/options/')))
      .toThrow('INVALID_FILE_KEY');
    expect(() => parseTransformRequest(new URL('https://cdn.uploadkit.dev/t/9999999999/sig/options/%E0%A4%A')))
      .toThrow('INVALID_FILE_KEY');
  });

  it('parses stable public transform URLs without an expiry', async () => {
    const { parseTransformRequest } = await import('../src/index');
    const parsed = parseTransformRequest(new URL(
      'https://cdn.uploadkit.dev/p/signature/options/project/images/photo.jpg',
    ));
    expect(parsed).toMatchObject({
      delivery: 'public', expires: null, signature: 'signature',
      encodedTransform: 'options', key: 'project/images/photo.jpg',
    });
  });
});
