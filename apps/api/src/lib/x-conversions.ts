import { createHash, createHmac, randomBytes } from 'node:crypto';

const X_ADS_API_VERSION = '12';
const MAX_ATTEMPTS = 3;

interface XAdsConfig {
  accessToken: string;
  accessTokenSecret: string;
  apiKey: string;
  apiSecret: string;
  pixelId: string;
  purchaseEventId: string;
}

export interface XPurchaseConversion {
  conversionId: string;
  conversionTime: string;
  currency: string;
  email?: string | null;
  plan?: string | null;
  twclid?: string | null;
  value: number;
}

function encode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function getConfig(): XAdsConfig | null {
  const config = {
    accessToken: process.env.X_ADS_ACCESS_TOKEN,
    accessTokenSecret: process.env.X_ADS_ACCESS_TOKEN_SECRET,
    apiKey: process.env.X_ADS_API_KEY,
    apiSecret: process.env.X_ADS_API_SECRET,
    pixelId: process.env.X_ADS_PIXEL_ID,
    purchaseEventId: process.env.X_ADS_PURCHASE_EVENT_ID,
  };

  if (Object.values(config).some((value) => !value)) return null;
  return config as XAdsConfig;
}

function createOAuthHeader(url: string, config: XAdsConfig): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: config.apiKey,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: config.accessToken,
    oauth_version: '1.0',
  };
  const parameterString = Object.entries(oauthParams)
    .map(([key, value]) => [encode(key), encode(value)] as const)
    .sort(([keyA, valueA], [keyB, valueB]) =>
      keyA === keyB ? valueA.localeCompare(valueB) : keyA.localeCompare(keyB),
    )
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const signatureBase = ['POST', encode(url), encode(parameterString)].join('&');
  const signingKey = `${encode(config.apiSecret)}&${encode(config.accessTokenSecret)}`;
  const signature = createHmac('sha1', signingKey).update(signatureBase).digest('base64');

  return `OAuth ${Object.entries({ ...oauthParams, oauth_signature: signature })
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${encode(key)}="${encode(value)}"`)
    .join(', ')}`;
}

function hashEmail(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function sendXPurchaseConversion(
  conversion: XPurchaseConversion,
): Promise<boolean> {
  const config = getConfig();
  if (!config) return false;

  const identifiers: Array<Record<string, string>> = [];
  if (conversion.twclid) identifiers.push({ twclid: conversion.twclid });
  if (conversion.email) identifiers.push({ hashed_email: hashEmail(conversion.email) });
  if (identifiers.length === 0) return false;

  const url = `https://ads-api.x.com/${X_ADS_API_VERSION}/measurement/conversions/${encode(config.pixelId)}`;
  const body = JSON.stringify({
    conversions: [
      {
        conversion_time: conversion.conversionTime,
        event_id: config.purchaseEventId,
        identifiers,
        value: conversion.value,
        price_currency: conversion.currency.toUpperCase(),
        number_items: 1,
        conversion_id: conversion.conversionId,
        description: conversion.plan
          ? `UploadKit ${conversion.plan} subscription`
          : 'UploadKit subscription',
        contents: conversion.plan
          ? [
              {
                content_id: conversion.plan.toLowerCase(),
                content_name: `${conversion.plan} subscription`,
                content_type: 'subscription',
                content_price: conversion.value,
                num_items: 1,
              },
            ]
          : undefined,
      },
    ],
  });

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          authorization: createOAuthHeader(url, config),
          'content-type': 'application/json',
        },
        body,
        signal: AbortSignal.timeout(5_000),
      });

      if (response.ok) return true;
      if (response.status < 500 && response.status !== 429) {
        console.warn(`[x-conversions] Rejected conversion with status ${response.status}`);
        return false;
      }
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        const message = error instanceof Error ? error.message : 'Unknown network error';
        console.warn(`[x-conversions] Conversion delivery failed: ${message}`);
      }
    }

    if (attempt < MAX_ATTEMPTS) await wait(250 * 2 ** (attempt - 1));
  }

  return false;
}
