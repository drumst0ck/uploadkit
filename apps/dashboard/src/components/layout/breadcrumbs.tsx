'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Human-readable labels for the page segment under /dashboard/projects/[slug]/
const SEGMENT_LABELS: Record<string, string> = {
  files: 'Files',
  keys: 'API keys',
  routes: 'Routers',
  transforms: 'Transformations',
  logs: 'Logs',
  webhooks: 'Webhooks',
  settings: 'Settings',
};

/** pd breadcrumb, shown only inside a project: Projects / slug / Page. */
export function Breadcrumbs() {
  const pathname = usePathname();
  const match = pathname.match(/^\/dashboard\/projects\/([^/]+)(?:\/([^/]+))?/);
  if (!match || match[1] === 'new') return null;

  const slug = match[1] as string;
  const page = match[2];

  return (
    <nav className="pd-breadcrumb mb-1" aria-label="Breadcrumb">
      <ol>
        <li>
          <Link href="/dashboard/projects" style={{ minHeight: '2rem' }}>Projects</Link>
        </li>
        <li>
          {page ? (
            <Link href={`/dashboard/projects/${slug}`} style={{ minHeight: '2rem' }}>{slug}</Link>
          ) : (
            <span aria-current="page">{slug}</span>
          )}
        </li>
        {page ? (
          <li>
            <span aria-current="page">{SEGMENT_LABELS[page] ?? page}</span>
          </li>
        ) : null}
      </ol>
    </nav>
  );
}
