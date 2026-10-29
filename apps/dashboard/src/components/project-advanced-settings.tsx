'use client';

import * as React from 'react';
import type { Tier } from '@uploadkitdev/shared';
import { TierGate } from './tier-gate';

const DOCS_BYOS_URL =
  `${process.env.NEXT_PUBLIC_DOCS_URL ?? 'https://docs.uploadkit.dev'}/docs/core-concepts/byos`;

export function SelfHostedSdkCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-1 text-sm font-medium text-foreground">UploadKit Cloud storage</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        This project stores files on UploadKit&apos;s managed R2 + CDN. API keys from this dashboard
        always target <code className="text-foreground">api.uploadkit.dev</code> — not your own bucket.
      </p>
      <p className="mb-4 text-xs text-muted-foreground">
        Want to self-host with your S3, R2, GCS, or B2 bucket? Use the open-source SDK in your app
        and pass <code className="text-foreground">storage</code> to{' '}
        <code className="text-foreground">createUploadKitHandler</code>. No dashboard toggle — credentials
        stay in your server env.
      </p>
      <a
        href={DOCS_BYOS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-foreground"
      >
        Self-hosted BYOS guide
        <span aria-hidden>↗</span>
      </a>
    </div>
  );
}

interface CustomDomainSettingsProps {
  slug: string;
  tier: Tier;
  initialDomain?: string;
  initialStatus?: string;
  initialVerified: boolean;
  initialValidationRecords?: Array<{ type: 'cname' | 'txt'; name: string; value: string }>;
  initialLastError?: string;
  fallbackOrigin?: string | null;
  cloudflareOAuthConfigured?: boolean;
}

const CF_DNS_MESSAGES: Record<string, string> = {
  success: 'DNS records configured in Cloudflare. Click Verify DNS to finish.',
  denied: 'Cloudflare authorization was cancelled.',
  oauth_error: 'Cloudflare rejected the authorization request. Check the OAuth configuration.',
  misconfigured: 'Cloudflare OAuth is not configured on this server.',
  project_mismatch: 'Project domain changed during authorization. Try again.',
  error: 'Failed to configure DNS in Cloudflare.',
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  none: { label: 'Not configured', className: 'text-muted-foreground' },
  pending: { label: 'Registering…', className: 'text-amber-400' },
  pending_validation: { label: 'Awaiting DNS', className: 'text-amber-400' },
  active: { label: 'Active', className: 'text-emerald-400' },
  failed: { label: 'Failed', className: 'text-red-400' },
};

export function CustomDomainSettings({
  slug,
  tier,
  initialDomain,
  initialStatus = 'none',
  initialVerified,
  initialValidationRecords = [],
  initialLastError,
  fallbackOrigin,
  cloudflareOAuthConfigured = false,
}: CustomDomainSettingsProps) {
  const [domain, setDomain] = React.useState(initialDomain ?? '');
  const [status, setStatus] = React.useState(initialStatus);
  const [verified, setVerified] = React.useState(initialVerified);
  const [validationRecords, setValidationRecords] = React.useState(initialValidationRecords);
  const [lastError, setLastError] = React.useState(initialLastError ?? '');
  const [saving, setSaving] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [autoVerifying, setAutoVerifying] = React.useState(false);
  const [dnsConfigured, setDnsConfigured] = React.useState(initialVerified);
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [onCloudflare, setOnCloudflare] = React.useState<boolean | null>(null);
  const [detecting, setDetecting] = React.useState(false);

  const statusUi = STATUS_LABELS[status] ?? STATUS_LABELS.none!;

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cfDns = params.get('cf_dns');
    if (!cfDns) return;

    const customMsg = params.get('cf_dns_msg');
    const text = customMsg ?? CF_DNS_MESSAGES[cfDns] ?? CF_DNS_MESSAGES.error!;
    if (cfDns === 'success') {
      setMessage('DNS records configured. Waiting for Cloudflare to activate the domain…');
      setDnsConfigured(true);
      setAutoVerifying(true);
    } else {
      setError(text);
    }

    params.delete('cf_dns');
    params.delete('cf_dns_msg');
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', next);
  }, []);

  React.useEffect(() => {
    if (!autoVerifying) return;

    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/internal/projects/${slug}/cdn/verify`, { method: 'POST' });
        const data = (await res.json()) as {
          error?: string;
          status?: string;
          verified?: boolean;
          validationRecords?: typeof validationRecords;
          lastError?: string;
        };
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? 'Verification failed.');

        setStatus(data.status ?? 'pending_validation');
        setVerified(Boolean(data.verified));
        setValidationRecords(data.validationRecords ?? []);
        setLastError(data.lastError ?? '');

        if (data.verified) {
          setAutoVerifying(false);
          setMessage('Custom domain is active. New uploads now use your domain.');
          return;
        }
      } catch (pollError) {
        if (cancelled) return;
        setError(pollError instanceof Error ? pollError.message : 'Verification failed.');
        setAutoVerifying(false);
        return;
      }

      if (attempts >= 20) {
        setAutoVerifying(false);
        setMessage('DNS is configured but still propagating. You can safely leave this page.');
        return;
      }

      timer = window.setTimeout(() => { void poll(); }, 3_000);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [autoVerifying, slug]);

  React.useEffect(() => {
    const trimmed = domain.trim().toLowerCase();
    if (!trimmed || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(trimmed)) {
      setOnCloudflare(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setDetecting(true);
      void fetch(`/api/internal/projects/${slug}/cdn/detect?domain=${encodeURIComponent(trimmed)}`)
        .then(async (res) => {
          const data = (await res.json()) as { onCloudflare?: boolean; error?: string };
          if (!cancelled && res.ok) {
            setOnCloudflare(Boolean(data.onCloudflare));
          }
        })
        .catch(() => {
          if (!cancelled) setOnCloudflare(null);
        })
        .finally(() => {
          if (!cancelled) setDetecting(false);
        });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [domain, slug]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/internal/projects/${slug}/cdn`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customCdnDomain: domain.trim() || null }),
      });
      const data = (await res.json()) as {
        error?: string;
        status?: string;
        verified?: boolean;
        validationRecords?: typeof validationRecords;
        lastError?: string;
      };
      if (!res.ok) {
        setError(data.error ?? 'Failed to save domain.');
        return;
      }
      setStatus(data.status ?? 'pending_validation');
      setVerified(Boolean(data.verified));
      setValidationRecords(data.validationRecords ?? []);
      setLastError(data.lastError ?? '');
      setDnsConfigured(Boolean(data.verified));
      setMessage('Domain registered. Add the DNS records below, then verify.');
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  async function verifyNow() {
    setVerifying(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/internal/projects/${slug}/cdn/verify`, { method: 'POST' });
      const data = (await res.json()) as {
        error?: string;
        status?: string;
        verified?: boolean;
        validationRecords?: typeof validationRecords;
        lastError?: string;
      };
      if (!res.ok) {
        setError(data.error ?? 'Verification failed.');
        return;
      }
      setStatus(data.status ?? status);
      setVerified(Boolean(data.verified));
      setValidationRecords(data.validationRecords ?? validationRecords);
      setLastError(data.lastError ?? '');
      if (data.verified) setDnsConfigured(true);
      setMessage(data.verified ? 'Custom domain is active. New uploads use your domain.' : 'Still pending — check DNS records.');
    } catch {
      setError('Network error.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <TierGate tier={tier} feature="customCdnDomain" featureLabel="Custom CDN domain">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 text-sm font-medium text-foreground">Custom CDN domain</h2>
        <p className="mb-5 text-xs text-muted-foreground">
          Serve files from your domain via Cloudflare SSL for SaaS. Image transforms (/t/, /p/) still use{' '}
          <code className="text-foreground">cdn.uploadkit.dev</code>.
        </p>

        <ol aria-label="Custom domain setup progress" className="mb-5 grid gap-2 sm:grid-cols-3">
          {[
            { label: 'Domain', complete: status !== 'none' },
            { label: 'DNS records', complete: dnsConfigured },
            { label: 'Verified', complete: verified },
          ].map((step, index) => (
            <li
              key={step.label}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                step.complete
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-border bg-muted text-muted-foreground'
              }`}
            >
              <span
                aria-hidden
                className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold ${
                  step.complete ? 'bg-emerald-500 text-black' : 'bg-accent text-foreground'
                }`}
              >
                {step.complete ? '✓' : index + 1}
              </span>
              {step.label}
            </li>
          ))}
        </ol>

        <form onSubmit={(e) => { void save(e); }} className="flex flex-col gap-4">
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="cdn.example.com"
            className="rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
          />

          {domain && (
            <div className="rounded-lg border border-border bg-muted p-4 text-xs text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">
                Status: <span className={statusUi.className}>{statusUi.label}</span>
                {verified && ' — URLs use your domain'}
              </p>

              {(validationRecords.length > 0 || fallbackOrigin) && (
                <div className="mb-3">
                  <p className="mb-2 font-medium text-foreground">DNS records</p>
                  <ul className="space-y-2">
                    {(validationRecords.length > 0 ? validationRecords : fallbackOrigin
                      ? [{ type: 'cname' as const, name: domain, value: fallbackOrigin }]
                      : []
                    ).map((record) => (
                      <li key={`${record.type}-${record.name}`} className="font-mono text-[11px]">
                        <span className="uppercase text-foreground">{record.type}</span>{' '}
                        {record.name} → {record.value}
                      </li>
                    ))}
                  </ul>
                  <p className={`mt-3 text-[11px] leading-relaxed ${onCloudflare ? 'text-orange-400/90' : 'text-muted-foreground'}`}>
                    {detecting
                      ? 'Checking DNS provider…'
                      : onCloudflare
                        ? 'This domain uses Cloudflare DNS — set the CNAME to proxied (orange cloud).'
                        : 'External DNS: use DNS only (gray cloud) for the CNAME.'}
                  </p>
                </div>
              )}

              {lastError && <p className="text-red-400">{lastError}</p>}
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
          {message && <p className="text-xs text-emerald-400">{message}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {saving ? 'Saving…' : domain ? 'Update domain' : 'Remove domain'}
            </button>
            {domain && status !== 'active' && !autoVerifying && (
              <button
                type="button"
                disabled={verifying}
                onClick={() => { void verifyNow(); }}
                className="rounded-lg border border-border bg-accent px-4 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50"
              >
                {verifying ? 'Checking…' : 'Verify DNS'}
              </button>
            )}
            {domain && onCloudflare && cloudflareOAuthConfigured && status !== 'active' && !autoVerifying && (
              <div>
                <a
                  href={`/api/internal/cloudflare/oauth/start?slug=${encodeURIComponent(slug)}`}
                  aria-label="Auto configure DNS with Cloudflare"
                  className="inline-flex w-fit items-center gap-2.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <svg
                    aria-hidden
                    fill="none"
                    height="18"
                    viewBox="0 0 24 24"
                    width="18"
                    xmlns="http://www.w3.org/2000/svg"
                    className="shrink-0"
                  >
                    <rect fill="white" height="24" rx="12" width="24" />
                    <path
                      d="M15.6549 15.8589L15.7572 15.4676C15.8791 15.0023 15.8337 14.572 15.6293 14.256C15.4411 13.9648 15.1276 13.7934 14.7468 13.7734L7.53508 13.6725C7.51269 13.672 7.49073 13.6657 7.47098 13.6541C7.45117 13.6424 7.43421 13.6258 7.42128 13.6056C7.4087 13.5847 7.40064 13.5608 7.39779 13.5359C7.39501 13.5109 7.39751 13.4856 7.40509 13.4618C7.41746 13.4228 7.43991 13.3885 7.46966 13.3634C7.49949 13.3383 7.53521 13.3233 7.57261 13.3204L14.8512 13.2183C15.7146 13.1745 16.6494 12.3998 16.9767 11.4551L17.3917 10.2558C17.4088 10.2051 17.4127 10.1502 17.403 10.0972C16.9317 7.75297 15.0397 6 12.7775 6C10.6932 6 8.92347 7.48756 8.28867 9.55518C7.8597 9.19915 7.32487 9.03548 6.79142 9.09694C5.79147 9.20674 4.98748 10.097 4.88849 11.2028C4.86312 11.479 4.88168 11.7579 4.94348 12.0269C3.30998 12.0796 2 13.5594 2 15.3785C2.00021 15.5409 2.01105 15.703 2.03246 15.8637C2.03719 15.9008 2.0538 15.9348 2.07931 15.9595C2.10483 15.9842 2.13757 15.9979 2.17142 15.9981L15.4856 15.9999C15.4869 16 15.4881 16 15.4894 15.9999C15.527 15.9992 15.5635 15.9851 15.5933 15.9597C15.6231 15.9342 15.6447 15.8989 15.6549 15.8589Z"
                      fill="#F6821F"
                    />
                    <path
                      d="M18.0571 10.3428C17.9903 10.3428 17.9237 10.3446 17.8574 10.3483C17.8467 10.3492 17.8362 10.3517 17.8262 10.3559C17.8088 10.3625 17.7931 10.3736 17.7804 10.3883C17.7678 10.4031 17.7585 10.421 17.7535 10.4405L17.47 11.5236C17.3481 11.989 17.3934 12.4188 17.598 12.7349C17.7861 13.0264 18.0996 13.1975 18.4803 13.2174L20.0178 13.3195C20.0394 13.3203 20.0605 13.3266 20.0796 13.3381C20.0985 13.3495 20.1149 13.3656 20.1273 13.3853C20.14 13.4063 20.1482 13.4303 20.151 13.4555C20.1538 13.4806 20.1512 13.5061 20.1435 13.5299C20.1312 13.5689 20.1087 13.6031 20.079 13.6282C20.0493 13.6533 20.0136 13.6683 19.9763 13.6714L18.3789 13.7734C17.5116 13.8176 16.5769 14.5919 16.2499 15.5366L16.1345 15.8702C16.1297 15.8841 16.1279 15.8991 16.1294 15.9139C16.1309 15.9288 16.1354 15.9431 16.1429 15.9555C16.1503 15.968 16.1603 15.9784 16.172 15.9858C16.1838 15.9931 16.197 15.9973 16.2104 15.9979C16.2119 15.9979 16.2132 15.9979 16.2147 15.9979H21.7114C21.7433 15.9982 21.7745 15.987 21.8001 15.9658C21.8257 15.9447 21.8444 15.9149 21.8532 15.8809C21.9506 15.4967 21.9998 15.0995 21.9995 14.7005C21.9989 12.294 20.234 10.3428 18.0571 10.3428Z"
                      fill="#FBAD41"
                    />
                  </svg>
                  Auto configure
                </a>
              </div>
            )}
            {autoVerifying && (
              <span role="status" className="inline-flex items-center gap-2 text-xs text-amber-400">
                <span aria-hidden className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Verifying DNS…
              </span>
            )}
          </div>
        </form>
      </div>
    </TierGate>
  );
}

interface LifecycleSettingsProps {
  slug: string;
  initial: { enabled: boolean; retentionDays: number };
}

export function LifecycleSettings({ slug, initial }: LifecycleSettingsProps) {
  const [enabled, setEnabled] = React.useState(initial.enabled);
  const [retentionDays, setRetentionDays] = React.useState(initial.retentionDays || 30);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch(`/api/internal/projects/${slug}/lifecycle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, retentionDays }),
      });
      if (!res.ok) {
        setMessage('Failed to save lifecycle policy.');
        return;
      }
      setMessage('Lifecycle policy saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-1 text-sm font-medium text-foreground">File lifecycle</h2>
      <p className="mb-5 text-xs text-muted-foreground">
        Automatically delete uploaded files after a retention period. Runs daily via cron.
      </p>

      <form onSubmit={(e) => { void save(e); }} className="flex flex-col gap-4">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="accent-indigo-500"
          />
          Enable automatic deletion
        </label>

        {enabled && (
          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            Retention (days)
            <input
              type="number"
              min={1}
              max={3650}
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              className="max-w-[120px] rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
            />
          </label>
        )}

        {message && <p className="text-xs text-emerald-400">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save policy'}
        </button>
      </form>
    </div>
  );
}
