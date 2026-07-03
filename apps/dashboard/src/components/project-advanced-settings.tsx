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
        always target <code className="text-indigo-400">api.uploadkit.dev</code> — not your own bucket.
      </p>
      <p className="mb-4 text-xs text-muted-foreground">
        Want to self-host with your S3, R2, GCS, or B2 bucket? Use the open-source SDK in your app
        and pass <code className="text-indigo-400">storage</code> to{' '}
        <code className="text-indigo-400">createUploadKitHandler</code>. No dashboard toggle — credentials
        stay in your server env.
      </p>
      <a
        href={DOCS_BYOS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-400 hover:text-indigo-300"
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
          <code className="text-indigo-400">cdn.uploadkit.dev</code>.
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
                        <span className="uppercase text-indigo-400">{record.type}</span>{' '}
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
                  className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/90 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 shadow-[0_1px_0_rgba(255,255,255,0.35),0_6px_18px_rgba(0,0,0,0.18)] transition duration-150 hover:border-zinc-200 hover:bg-zinc-100 active:translate-y-px active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <svg aria-hidden viewBox="50 5 50 18" className="h-4 w-5 shrink-0">
                    <path fill="#f48120" d="M84.2 20.4a2.86 2.86 0 0 0-.3-2.6 3.09 3.09 0 0 0-2.1-1.1l-17.4-.2c-.1 0-.2-.1-.3-.1a.19.19 0 0 1 0-.3c.1-.2.2-.3.4-.3l17.5-.2a6.29 6.29 0 0 0 5.1-3.8l1-2.6c0-.1.1-.2 0-.3a11.4 11.4 0 0 0-21.9-1.2 5.46 5.46 0 0 0-3.6-1 5.21 5.21 0 0 0-4.6 4.6 5.46 5.46 0 0 0 .1 1.8 7.3 7.3 0 0 0-7.1 7.3 4.1 4.1 0 0 0 .1 1.1.32.32 0 0 0 .3.3h32.1c.2 0 .4-.1.4-.3Z" />
                    <path fill="#faad3f" d="M89.7 9.2h-.5c-.1 0-.2.1-.3.2l-.7 2.4a2.86 2.86 0 0 0 .3 2.6 3.09 3.09 0 0 0 2.1 1.1l3.7.2c.1 0 .2.1.3.1a.19.19 0 0 1 0 .3c-.1.2-.2.3-.4.3l-3.8.2a6.29 6.29 0 0 0-5.1 3.8l-.2.9c-.1.1 0 .3.2.3h13.2a.27.27 0 0 0 .3-.3 10.87 10.87 0 0 0 .4-2.6 9.56 9.56 0 0 0-9.5-9.5" />
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
