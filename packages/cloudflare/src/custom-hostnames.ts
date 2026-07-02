export interface CloudflareApiError {
  code: number;
  message: string;
}

export type CustomCdnStatus = 'none' | 'pending' | 'pending_validation' | 'active' | 'failed';

export interface CdnValidationRecord {
  type: 'cname' | 'txt';
  name: string;
  value: string;
}

export interface CustomHostnameState {
  id: string;
  hostname: string;
  status: CustomCdnStatus;
  sslStatus: string;
  validationRecords: CdnValidationRecord[];
  error?: string;
}

export interface CloudflareConfig {
  apiToken: string;
  zoneId: string;
  /** Hostname customers CNAME to (e.g. cdn.uploadkit.dev) */
  fallbackOrigin: string;
}

interface CfCustomHostname {
  id: string;
  hostname: string;
  status: string;
  ssl?: {
    status?: string;
    validation_records?: Array<{ txt_name?: string; txt_value?: string }>;
    validation_errors?: Array<{ message?: string }>;
  };
  ownership_verification?: { type?: string; name?: string; value?: string };
  verification_errors?: Array<{ message?: string }>;
}

const CF_API = 'https://api.cloudflare.com/client/v4';

export function getCloudflareConfig(): CloudflareConfig | null {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const fallbackOrigin =
    process.env.CLOUDFLARE_CDN_FALLBACK?.replace(/^https?:\/\//, '').replace(/\/$/, '')
    ?? process.env.CDN_URL?.replace(/^https?:\/\//, '').replace(/\/$/, '');

  if (!apiToken || !zoneId || !fallbackOrigin) return null;

  return { apiToken, zoneId, fallbackOrigin };
}

export function isCloudflareCdnConfigured(): boolean {
  return getCloudflareConfig() !== null;
}

async function cfRequest<T>(
  config: CloudflareConfig,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const body = (await res.json()) as {
    success: boolean;
    errors?: CloudflareApiError[];
    result: T;
  };

  if (!res.ok || !body.success) {
    const message = body.errors?.map((e) => e.message).join('; ')
      ?? `Cloudflare API error (${res.status})`;
    throw new Error(message);
  }

  return body.result;
}

function buildValidationRecords(
  config: CloudflareConfig,
  hostname: string,
  cf: CfCustomHostname,
): CdnValidationRecord[] {
  const records: CdnValidationRecord[] = [
    {
      type: 'cname',
      name: hostname,
      value: config.fallbackOrigin,
    },
  ];

  const ownership = cf.ownership_verification;
  if (ownership?.name && ownership.value) {
    records.push({ type: 'txt', name: ownership.name, value: ownership.value });
  }

  for (const record of cf.ssl?.validation_records ?? []) {
    if (record.txt_name && record.txt_value) {
      records.push({ type: 'txt', name: record.txt_name, value: record.txt_value });
    }
  }

  return records;
}

export function mapCustomHostnameState(
  config: CloudflareConfig,
  cf: CfCustomHostname,
): CustomHostnameState {
  const sslStatus = cf.ssl?.status ?? 'unknown';
  const errors = [
    ...(cf.verification_errors?.map((e) => e.message).filter(Boolean) ?? []),
    ...(cf.ssl?.validation_errors?.map((e) => e.message).filter(Boolean) ?? []),
  ] as string[];

  let status: CustomCdnStatus = 'pending';
  if (cf.status === 'active' && sslStatus === 'active') {
    status = 'active';
  } else if (sslStatus === 'pending_validation' || cf.status === 'pending') {
    status = 'pending_validation';
  } else if (errors.length > 0 || cf.status === 'deleted' || cf.status === 'moved') {
    status = 'failed';
  }

  return {
    id: cf.id,
    hostname: cf.hostname,
    status,
    sslStatus,
    validationRecords: buildValidationRecords(config, cf.hostname, cf),
    ...(errors.length > 0 ? { error: errors.join('; ') } : {}),
  };
}

export async function createCustomHostname(
  config: CloudflareConfig,
  hostname: string,
): Promise<CustomHostnameState> {
  const result = await cfRequest<CfCustomHostname>(
    config,
    `/zones/${config.zoneId}/custom_hostnames`,
    {
      method: 'POST',
      body: JSON.stringify({
        hostname,
        ssl: {
          method: 'http',
          type: 'dv',
          settings: { min_tls_version: '1.2' },
        },
      }),
    },
  );

  return mapCustomHostnameState(config, result);
}

export async function getCustomHostname(
  config: CloudflareConfig,
  hostnameId: string,
): Promise<CustomHostnameState> {
  const result = await cfRequest<CfCustomHostname>(
    config,
    `/zones/${config.zoneId}/custom_hostnames/${hostnameId}`,
  );
  return mapCustomHostnameState(config, result);
}

export async function deleteCustomHostname(
  config: CloudflareConfig,
  hostnameId: string,
): Promise<void> {
  await cfRequest<{ id: string }>(
    config,
    `/zones/${config.zoneId}/custom_hostnames/${hostnameId}`,
    { method: 'DELETE' },
  );
}
