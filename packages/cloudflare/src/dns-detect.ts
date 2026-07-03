const CF_NS_SUFFIX = '.ns.cloudflare.com';
const DOH_ENDPOINT = 'https://cloudflare-dns.com/dns-query';

interface DohAnswer {
  data?: string;
}

interface DohResponse {
  Answer?: DohAnswer[];
}

async function queryDns(name: string, type: 'NS' | 'TXT'): Promise<string[]> {
  const url = new URL(DOH_ENDPOINT);
  url.searchParams.set('name', name);
  url.searchParams.set('type', type);

  const res = await fetch(url, {
    headers: { Accept: 'application/dns-json' },
  });

  if (!res.ok) {
    throw new Error(`DNS lookup failed (${res.status})`);
  }

  const body = (await res.json()) as DohResponse;
  return (body.Answer ?? [])
    .map((answer) => answer.data?.toLowerCase().replace(/\.$/, '') ?? '')
    .filter(Boolean);
}

/** Best-effort apex for NS checks (does not handle all public suffixes). */
export function guessApexDomain(hostname: string): string {
  const labels = hostname.toLowerCase().split('.').filter(Boolean);
  if (labels.length <= 2) return labels.join('.');
  return labels.slice(-2).join('.');
}

export function isCloudflareNameserver(ns: string): boolean {
  return ns.endsWith(CF_NS_SUFFIX);
}

export async function isDomainOnCloudflare(hostname: string): Promise<boolean> {
  const labels = hostname.toLowerCase().split('.').filter(Boolean);

  // Walk towards the registrable domain instead of assuming a two-label apex.
  // This handles public suffixes such as co.uk without shipping a browser-sized PSL.
  for (let index = 0; index < labels.length - 1; index++) {
    const candidate = labels.slice(index).join('.');
    const nameservers = await queryDns(candidate, 'NS');
    if (nameservers.length > 0) {
      return nameservers.some(isCloudflareNameserver);
    }
  }

  return false;
}

/** DNS record name relative to a zone (e.g. cdn.todolol.com in zone todolol.com → cdn). */
export function dnsRecordName(hostname: string, zoneName: string): string {
  const host = hostname.toLowerCase();
  const zone = zoneName.toLowerCase();
  if (host === zone) return '@';
  const suffix = `.${zone}`;
  if (!host.endsWith(suffix)) {
    throw new Error(`Hostname ${hostname} is not under zone ${zoneName}`);
  }
  return host.slice(0, -suffix.length);
}
