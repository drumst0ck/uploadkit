'use client';

import * as React from 'react';
import type { Tier } from '@uploadkitdev/shared';
import { TierGate } from './tier-gate';

interface ByosSettingsProps {
  slug: string;
  tier: Tier;
  initial: {
    storageMode: 'managed' | 'byos';
    hasByosConfig: boolean;
    provider?: string;
    endpoint?: string;
    region?: string;
    bucket?: string;
    accessKeyId?: string;
    publicUrl?: string;
  };
}

export function ByosSettings({ slug, tier, initial }: ByosSettingsProps) {
  const [storageMode, setStorageMode] = React.useState(initial.storageMode);
  const [provider, setProvider] = React.useState(initial.provider ?? 'r2');
  const [endpoint, setEndpoint] = React.useState(initial.endpoint ?? '');
  const [region, setRegion] = React.useState(initial.region ?? 'auto');
  const [bucket, setBucket] = React.useState(initial.bucket ?? '');
  const [accessKeyId, setAccessKeyId] = React.useState(initial.accessKeyId ?? '');
  const [secretAccessKey, setSecretAccessKey] = React.useState('');
  const [publicUrl, setPublicUrl] = React.useState(initial.publicUrl ?? '');
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/internal/projects/${slug}/storage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storageMode,
          byosConfig:
            storageMode === 'byos'
              ? {
                  provider,
                  endpoint: endpoint || undefined,
                  region,
                  bucket,
                  accessKeyId,
                  ...(secretAccessKey ? { secretAccessKey } : {}),
                  publicUrl: publicUrl || undefined,
                }
              : null,
        }),
      });

      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to save storage settings.');
        return;
      }

      setMessage(data.message ?? 'Storage settings saved.');
      setSecretAccessKey('');
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/internal/projects/${slug}/storage/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          endpoint: endpoint || undefined,
          region,
          bucket,
          accessKeyId,
          secretAccessKey: secretAccessKey || undefined,
        }),
      });

      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Connection test failed.');
        return;
      }

      setMessage('Connection successful — bucket is reachable.');
    } catch {
      setError('Network error during connection test.');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-1 text-sm font-medium text-foreground">Storage mode</h2>
      <p className="mb-5 text-xs text-muted-foreground">
        BYOS keeps uploads on your bucket. Credentials are encrypted and never sent to the browser.
        Use the generated snippet in your server handler.
      </p>

      <form onSubmit={(e) => { void save(e); }} className="flex flex-col gap-4">
        <div className="flex gap-3">
          {(['managed', 'byos'] as const).map((mode) => (
            <label
              key={mode}
              className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors ${
                storageMode === mode
                  ? 'border-indigo-500/50 bg-indigo-500/10 text-foreground'
                  : 'border-border bg-accent text-muted-foreground hover:text-foreground'
              }`}
            >
              <input
                type="radio"
                name="storageMode"
                value={mode}
                checked={storageMode === mode}
                onChange={() => setStorageMode(mode)}
                className="accent-indigo-500"
              />
              {mode === 'managed' ? 'UploadKit Cloud' : 'Bring Your Own Storage'}
            </label>
          ))}
        </div>

        {storageMode === 'byos' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Provider">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              >
                <option value="r2">Cloudflare R2</option>
                <option value="s3">AWS S3</option>
                <option value="minio">MinIO</option>
                <option value="other">Other S3-compatible</option>
              </select>
            </Field>
            <Field label="Region">
              <input value={region} onChange={(e) => setRegion(e.target.value)} className="rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30" />
            </Field>
            <Field label="Endpoint (optional)">
              <input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://account.r2.cloudflarestorage.com"
                className="rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              />
            </Field>
            <Field label="Bucket">
              <input value={bucket} onChange={(e) => setBucket(e.target.value)} className="rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30" />
            </Field>
            <Field label="Access key ID">
              <input value={accessKeyId} onChange={(e) => setAccessKeyId(e.target.value)} className="rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30" />
            </Field>
            <Field label={initial.hasByosConfig ? 'Secret key (leave blank to keep)' : 'Secret access key'}>
              <input
                type="password"
                value={secretAccessKey}
                onChange={(e) => setSecretAccessKey(e.target.value)}
                className="rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Public URL (optional)">
              <input
                value={publicUrl}
                onChange={(e) => setPublicUrl(e.target.value)}
                placeholder="https://cdn.example.com"
                className="rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 sm:col-span-2"
              />
            </Field>
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
            {saving ? 'Saving…' : 'Save storage settings'}
          </button>
          {storageMode === 'byos' && (
            <button
              type="button"
              disabled={testing || !bucket || !accessKeyId}
              onClick={() => { void testConnection(); }}
              className="rounded-lg border border-border bg-accent px-4 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50"
            >
              {testing ? 'Testing…' : 'Test connection'}
            </button>
          )}
        </div>
      </form>

      {storageMode === 'byos' && initial.hasByosConfig && (
        <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-4 text-xs text-muted-foreground">
{`import { createUploadKitHandler } from '@uploadkitdev/next';
import { createR2Storage } from '@uploadkitdev/next/byos';

export const { GET, POST } = createUploadKitHandler({
  router: fileRouter,
  storage: createR2Storage({
    accountId: '...',
    accessKeyId: '${accessKeyId || 'YOUR_KEY'}',
    secretAccessKey: process.env.BYOS_SECRET!,
    bucket: '${bucket || 'your-bucket'}',
  }),
});`}
        </pre>
      )}

      <p className="mt-3 text-xs text-amber-400/90">
        Image transforms require UploadKit Cloud — BYOS projects use your bucket directly without transform CDN.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

interface CustomDomainSettingsProps {
  slug: string;
  tier: Tier;
  initialDomain?: string;
  verified: boolean;
}

export function CustomDomainSettings({ slug, tier, initialDomain, verified }: CustomDomainSettingsProps) {
  const [domain, setDomain] = React.useState(initialDomain ?? '');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');

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
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to save domain.');
        return;
      }
      setMessage('Domain saved. Add the DNS record below to verify.');
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <TierGate tier={tier} feature="customCdnDomain" featureLabel="Custom CDN domain">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 text-sm font-medium text-foreground">Custom CDN domain</h2>
        <p className="mb-5 text-xs text-muted-foreground">
          Serve files from your own domain via Cloudflare. Verification runs after DNS propagates.
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
              <p className="mb-2 font-medium text-foreground">DNS setup</p>
              <p>CNAME <code className="text-indigo-400">{domain}</code> → <code>cdn.uploadkit.dev</code></p>
              <p className="mt-2">
                Status:{' '}
                <span className={verified ? 'text-emerald-400' : 'text-amber-400'}>
                  {verified ? 'Verified' : 'Pending verification'}
                </span>
              </p>
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
          {message && <p className="text-xs text-emerald-400">{message}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-fit rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save domain'}
          </button>
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
