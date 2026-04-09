'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';

// Human-readable labels for known URL segments (D-03)
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  files: 'Files',
  keys: 'API Keys',
  routes: 'File Routes',
  logs: 'Logs',
  usage: 'Usage',
  billing: 'Billing',
  settings: 'Settings',
};

function getLabel(segment: string): string {
  return SEGMENT_LABELS[segment] ?? segment;
}

export function Breadcrumbs() {
  const pathname = usePathname();

  // Build breadcrumb segments from the URL path
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  // Build cumulative href per segment
  const crumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    return { label: getLabel(segment), href };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <React.Fragment key={crumb.href}>
            {index > 0 && (
              <ChevronRight
                className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            )}
            {isLast ? (
              <span
                className={cn(
                  'font-medium text-foreground',
                  'max-w-[200px] truncate'
                )}
                aria-current="page"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground transition-colors hover:text-foreground max-w-[200px] truncate"
              >
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
