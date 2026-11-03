import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '../proxy';

const cookie = (url: string, headers: Record<string, string> = {}) =>
  proxy(new NextRequest(url, { headers })).cookies.get('uk_twclid');

describe('twclid cookie', () => {
  it('is Secure on https preview hosts outside uploadkit.dev', () => {
    const res = proxy(new NextRequest('https://preview-123.vercel.app/?twclid=abc'));
    expect(res.headers.get('set-cookie')).toMatch(/Secure/i);
  });
  it('is Secure behind a TLS-terminating proxy (x-forwarded-proto)', () => {
    const res = proxy(new NextRequest('http://internal:3000/?twclid=abc', { headers: { 'x-forwarded-proto': 'https' } }));
    expect(res.headers.get('set-cookie')).toMatch(/Secure/i);
  });
  it('is not Secure on plain http localhost so dev still works', () => {
    const res = proxy(new NextRequest('http://localhost:3000/?twclid=abc'));
    expect(res.headers.get('set-cookie')).not.toMatch(/Secure/i);
    expect(cookie('http://localhost:3000/?twclid=abc')?.value).toBe('abc');
  });
  it('keeps the .uploadkit.dev domain and Secure there', () => {
    const res = proxy(new NextRequest('https://uploadkit.dev/?twclid=abc'));
    expect(res.headers.get('set-cookie')).toMatch(/Domain=\.?uploadkit\.dev/i);
    expect(res.headers.get('set-cookie')).toMatch(/Secure/i);
  });
});
