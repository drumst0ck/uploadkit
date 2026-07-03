import { dnsRecordName } from './dns-detect';
import type { CdnValidationRecord } from './custom-hostnames';

const CF_API = 'https://api.cloudflare.com/client/v4';
const DEFAULT_AUTH_DOMAIN = 'dash.cloudflare.com';

export interface CloudflareOAuthConfig {
  clientId: string;
  clientSecret: string;
  /** Space-separated OAuth scope IDs (dot notation, e.g. zone.dns.write zone.read). */
  scopes: string;
  authDomain: string;
}

export interface CloudflareZone {
  id: string;
  name: string;
}

export interface CloudflareOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

interface CfApiResult<T> {
  success: boolean;
  errors?: Array<{ message?: string }>;
  result: T;
}

interface CfZone {
  id: string;
  name: string;
}

interface CfDnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied?: boolean;
}

export class CloudflareDnsConflictError extends Error {
  constructor(recordName: string, currentValue: string, desiredValue: string) {
    super(
      `DNS conflict for ${recordName}: the existing record points to ${currentValue}. `
      + `Remove or update it manually before configuring ${desiredValue}.`,
    );
    this.name = 'CloudflareDnsConflictError';
  }
}

export function getCloudflareOAuthConfig(): CloudflareOAuthConfig | null {
  const clientId = process.env.CLOUDFLARE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.CLOUDFLARE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  return {
    clientId,
    clientSecret,
    scopes:
      process.env.CLOUDFLARE_OAUTH_SCOPES?.trim()
      || 'zone.read dns.write offline_access',
    authDomain: process.env.CLOUDFLARE_OAUTH_DOMAIN ?? DEFAULT_AUTH_DOMAIN,
  };
}

export function isCloudflareOAuthConfigured(): boolean {
  return getCloudflareOAuthConfig() !== null;
}

function authBase(config: CloudflareOAuthConfig): string {
  return `https://${config.authDomain}`;
}

export function buildCloudflareAuthorizationUrl(
  config: CloudflareOAuthConfig,
  redirectUri: string,
  state: string,
): string {
  const url = new URL(`${authBase(config)}/oauth2/auth`);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scopes);
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeCloudflareOAuthCode(
  config: CloudflareOAuthConfig,
  code: string,
  redirectUri: string,
): Promise<CloudflareOAuthTokens> {
  const res = await fetch(`${authBase(config)}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  const body = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !body.access_token) {
    const message = body.error_description ?? body.error ?? `OAuth token exchange failed (${res.status})`;
    throw new Error(message);
  }

  return {
    accessToken: body.access_token,
    ...(body.refresh_token ? { refreshToken: body.refresh_token } : {}),
    ...(body.expires_in ? { expiresIn: body.expires_in } : {}),
  };
}

async function oauthRequest<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const body = (await res.json()) as CfApiResult<T>;
  if (!res.ok || !body.success) {
    const message = body.errors?.map((e) => e.message).filter(Boolean).join('; ')
      ?? `Cloudflare API error (${res.status})`;
    throw new Error(message);
  }

  return body.result;
}

export async function listCloudflareZones(accessToken: string): Promise<CloudflareZone[]> {
  const zones = await oauthRequest<CfZone[]>(accessToken, '/zones?per_page=50');
  return zones.map((zone) => ({ id: zone.id, name: zone.name }));
}

export function findZoneForHostname(
  zones: CloudflareZone[],
  hostname: string,
): CloudflareZone | null {
  const host = hostname.toLowerCase();
  const matches = zones
    .filter((zone) => host === zone.name || host.endsWith(`.${zone.name}`))
    .sort((a, b) => b.name.length - a.name.length);
  return matches[0] ?? null;
}

async function listDnsRecords(
  accessToken: string,
  zoneId: string,
  name: string,
  type?: string,
): Promise<CfDnsRecord[]> {
  const params = new URLSearchParams({ name });
  if (type) params.set('type', type);
  return oauthRequest<CfDnsRecord[]>(
    accessToken,
    `/zones/${zoneId}/dns_records?${params.toString()}`,
  );
}

async function upsertDnsRecord(
  accessToken: string,
  zoneId: string,
  input: {
    type: 'CNAME' | 'TXT';
    name: string;
    content: string;
    proxied?: boolean;
  },
): Promise<void> {
  const existing = await listDnsRecords(accessToken, zoneId, input.name);
  const payload = {
    type: input.type,
    name: input.name,
    content: input.content,
    ttl: 1,
    ...(input.type === 'CNAME' ? { proxied: input.proxied ?? true } : {}),
  };

  const sameRecord = existing.find(
    (record) => record.type === input.type && normalizeDnsValue(record.content) === normalizeDnsValue(input.content),
  );

  if (sameRecord) {
    if (input.type === 'CNAME' && sameRecord.proxied !== (input.proxied ?? true)) {
      await oauthRequest(accessToken, `/zones/${zoneId}/dns_records/${sameRecord.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    }
    return;
  }

  if (input.type === 'CNAME' && existing.length > 0) {
    const conflict = existing[0]!;
    throw new CloudflareDnsConflictError(input.name, conflict.content, input.content);
  }

  await oauthRequest(accessToken, `/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

function normalizeDnsValue(value: string): string {
  return value.trim().replace(/\.$/, '').toLowerCase();
}

export interface ApplyDnsRecordsResult {
  zone: CloudflareZone;
  applied: Array<{ type: string; name: string; value: string }>;
}

export async function applyCdnValidationRecords(
  accessToken: string,
  hostname: string,
  records: CdnValidationRecord[],
): Promise<ApplyDnsRecordsResult> {
  const zones = await listCloudflareZones(accessToken);
  const zone = findZoneForHostname(zones, hostname);
  if (!zone) {
    throw new Error(`No Cloudflare zone found for ${hostname}. Add the domain to your Cloudflare account first.`);
  }

  const applied: ApplyDnsRecordsResult['applied'] = [];

  for (const record of records) {
    const relativeName = dnsRecordName(record.name, zone.name);
    const fullName = relativeName === '@' ? zone.name : `${relativeName}.${zone.name}`;

    if (record.type === 'cname') {
      await upsertDnsRecord(accessToken, zone.id, {
        type: 'CNAME',
        name: fullName,
        content: record.value,
        proxied: true,
      });
      applied.push({ type: 'CNAME', name: fullName, value: record.value });
      continue;
    }

    if (record.type === 'txt') {
      await upsertDnsRecord(accessToken, zone.id, {
        type: 'TXT',
        name: fullName,
        content: record.value,
      });
      applied.push({ type: 'TXT', name: fullName, value: record.value });
    }
  }

  return { zone, applied };
}
