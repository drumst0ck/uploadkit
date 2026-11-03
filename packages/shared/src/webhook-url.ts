// This package compiles without DOM/Node libs; URL exists at runtime everywhere it is used.
declare const URL: new (input: string) => {
  protocol: string;
  username: string;
  password: string;
  hostname: string;
};

const MAX_WEBHOOK_URL_LENGTH = 2048;
const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home.arpa'];

/**
 * Validates a customer-supplied webhook URL. Returns an error message, or null when valid.
 * Requires https, no credentials, and a DNS hostname: IP literals (v4/v6), localhost
 * and private/internal name suffixes are rejected.
 */
export function validateWebhookUrl(input: string): string | null {
  if (input.length > MAX_WEBHOOK_URL_LENGTH) {
    return `Webhook URL must be at most ${MAX_WEBHOOK_URL_LENGTH} characters`;
  }
  let url: InstanceType<typeof URL>;
  try {
    url = new URL(input);
  } catch {
    return 'Webhook URL is not a valid URL';
  }
  if (url.protocol !== 'https:') return 'Webhook URL must use https';
  if (url.username || url.password) return 'Webhook URL must not contain credentials';

  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (host.startsWith('[') || host.includes(':')) return 'Webhook URL must not use an IP address';
  if (/^\d+(\.\d+){0,3}$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) {
    return 'Webhook URL must not use an IP address';
  }
  if (host === 'localhost' || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) {
    return 'Webhook URL must point to a public host';
  }
  if (!host.includes('.')) return 'Webhook URL must point to a public host';
  return null;
}
