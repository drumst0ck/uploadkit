'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../../lib/cn';

interface NavItem {
  label: string;
  href: string;
}

const ACCOUNT_NAV: NavItem[] = [
  { label: 'Overview', href: '/dashboard' },
  { label: 'Projects', href: '/dashboard/projects' },
  { label: 'Usage', href: '/dashboard/usage' },
  { label: 'Billing', href: '/dashboard/billing' },
  { label: 'Team', href: '/dashboard/team' },
  { label: 'Settings', href: '/dashboard/settings' },
];

/**
 * Project sub-navigation, nested under "Projects" while inside a project.
 * `path` is relative to /dashboard/projects/[slug]; `absolute` targets pages that
 * are not per-project yet:
 *  - Rejected: no dedicated page yet, points at the upload logs.
 *  - Usage: no per-project usage page yet, points at the account usage page.
 */
const PROJECT_NAV: Array<{ label: string; path?: string; absolute?: string }> = [
  { label: 'Files', path: 'files' },
  { label: 'Rejected', path: 'logs' },
  { label: 'Usage', absolute: '/dashboard/usage' },
  { label: 'Routers', path: 'routes' },
  { label: 'API keys', path: 'keys' },
  { label: 'Transformations', path: 'transforms' },
  { label: 'Webhooks', path: 'webhooks' },
  { label: 'Settings', path: 'settings' },
];

const rowClass =
  'flex h-10 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors duration-[120ms] hover:bg-secondary hover:text-foreground aria-[current=page]:bg-secondary aria-[current=page]:text-foreground';

interface SidebarNavProps {
  isAdmin?: boolean;
}

export function SidebarNav({ isAdmin = false }: SidebarNavProps) {
  const pathname = usePathname();
  const slug = pathname.match(/^\/dashboard\/projects\/([^/]+)/)?.[1];
  const projectBase = slug ? `/dashboard/projects/${slug}` : null;

  function isActive(href: string): boolean {
    if (href === '/dashboard') return pathname === '/dashboard';
    // /dashboard/projects is the parent of the project sub-nav; it is current only on the list itself
    if (href === '/dashboard/projects') return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const items: NavItem[] = isAdmin
    ? [...ACCOUNT_NAV, { label: 'Admin', href: '/dashboard/admin' }]
    : ACCOUNT_NAV;

  return (
    <nav aria-label="Dashboard">
      <ul className="grid gap-0.5">
        {items.map((item) => {
          const isProjects = item.href === '/dashboard/projects';
          const showSub = isProjects && projectBase !== null;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(rowClass, showSub && 'text-foreground')}
              >
                {item.label}
              </Link>
              {showSub && projectBase ? (
                <ul className="mb-1.5 mt-0.5 grid gap-0.5" aria-label={`${slug} project`}>
                  {PROJECT_NAV.map((sub) => {
                    const href = sub.absolute ?? `${projectBase}/${sub.path}`;
                    // Usage points at the account page, so it is never the "current" project row
                    const current = sub.absolute ? false : isActive(href);
                    return (
                      <li key={sub.label}>
                        <Link
                          href={href}
                          aria-current={current ? 'page' : undefined}
                          className={cn(rowClass, 'h-9 pl-7')}
                        >
                          {sub.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
