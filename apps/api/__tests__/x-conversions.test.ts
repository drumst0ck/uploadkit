import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendXPurchaseConversion } from '@/lib/x-conversions';

const ENV_KEYS = [
  'X_ADS_API_KEY',
  'X_ADS_API_SECRET',
  'X_ADS_ACCESS_TOKEN',
  'X_ADS_ACCESS_TOKEN_SECRET',
  'X_ADS_PIXEL_ID',
  'X_ADS_PURCHASE_EVENT_ID',
] as const;

describe('sendXPurchaseConversion', () => {
  beforeEach(() => {
    process.env.X_ADS_API_KEY = 'consumer-key';
    process.env.X_ADS_API_SECRET = 'consumer-secret';
    process.env.X_ADS_ACCESS_TOKEN = 'access-token';
    process.env.X_ADS_ACCESS_TOKEN_SECRET = 'access-secret';
    process.env.X_ADS_PIXEL_ID = 'pixel123';
    process.env.X_ADS_PURCHASE_EVENT_ID = 'event123';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const key of ENV_KEYS) delete process.env[key];
  });

  it('sends a deduplicated purchase with X attribution identifiers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const sent = await sendXPurchaseConversion({
      conversionId: 'in_123',
      conversionTime: '2026-06-29T10:00:00.000Z',
      currency: 'usd',
      email: ' Buyer@Example.com ',
      plan: 'PRO',
      twclid: 'x-click-123',
      value: 15,
    });

    expect(sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://ads-api.x.com/12/measurement/conversions/pixel123');
    expect(init.headers).toEqual(
      expect.objectContaining({
        authorization: expect.stringMatching(/^OAuth /),
        'content-type': 'application/json',
      }),
    );

    const body = JSON.parse(init.body as string);
    expect(body.conversions[0]).toEqual(
      expect.objectContaining({
        conversion_id: 'in_123',
        event_id: 'event123',
        price_currency: 'USD',
        value: 15,
        identifiers: [
          { twclid: 'x-click-123' },
          {
            hashed_email: createHash('sha256')
              .update('buyer@example.com')
              .digest('hex'),
          },
        ],
      }),
    );
  });

  it('skips delivery when the optional X Ads credentials are not configured', async () => {
    delete process.env.X_ADS_API_SECRET;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      sendXPurchaseConversion({
        conversionId: 'in_123',
        conversionTime: '2026-06-29T10:00:00.000Z',
        currency: 'USD',
        email: 'buyer@example.com',
        value: 15,
      }),
    ).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
