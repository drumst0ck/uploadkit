'use client';

import type { Tier } from '@uploadkitdev/shared';
import { TierGate } from './tier-gate';

interface WebhookRoute {
  slug: string;
  webhookUrl?: string | undefined;
}

interface WebhookFailure {
  fileId: string;
  fileName: string;
  routeSlug: string;
  failedAt: string;
}

interface WebhooksPanelProps {
  tier: Tier;
  routes: WebhookRoute[];
  failures: WebhookFailure[];
}

export function WebhooksPanel({ tier, routes, failures }: WebhooksPanelProps) {
  return (
    <TierGate tier={tier} feature="webhooks" featureLabel="Webhooks">
      <div className="flex flex-col gap-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-medium text-foreground">Configured routes</h2>
          {routes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No webhook URLs configured. Add a webhook URL on the File Routes page.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {routes.map((route) => (
                <li key={route.slug} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-mono text-foreground">{route.slug}</span>
                  <span className="truncate text-xs text-muted-foreground">{route.webhookUrl ?? '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-medium text-foreground">Recent delivery failures</h2>
          {failures.length === 0 ? (
            <p className="text-sm text-emerald-400">No webhook failures in the last 30 days.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {failures.map((f) => (
                <li key={f.fileId} className="px-4 py-3 text-sm">
                  <p className="text-foreground">{f.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    Route <span className="font-mono">{f.routeSlug}</span> ·{' '}
                    {new Date(f.failedAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </TierGate>
  );
}
