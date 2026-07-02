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
}

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
}: CustomDomainSettingsProps) {
  const [domain, setDomain] = React.useState(initialDomain ?? '');
  const [status, setStatus] = React.useState(initialStatus);
  const [verified, setVerified] = React.useState(initialVerified);
  const [validationRecords, setValidationRecords] = React.useState(initialValidationRecords);
  const [lastError, setLastError] = React.useState(initialLastError ?? '');
  const [saving, setSaving] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');

  const statusUi = STATUS_LABELS[status] ?? STATUS_LABELS.none!;

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
                </div>
              )}

              {lastError && <p className="text-red-400">{lastError}</p>}
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
          {message && <p className="text-xs text-emerald-400">{message}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {saving ? 'Saving…' : domain ? 'Update domain' : 'Remove domain'}
            </button>
            {domain && status !== 'active' && (
              <button
                type="button"
                disabled={verifying}
                onClick={() => { void verifyNow(); }}
                className="rounded-lg border border-border bg-accent px-4 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50"
              >
                {verifying ? 'Checking…' : 'Verify DNS'}
              </button>
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
