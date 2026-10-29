'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderOpen, Gauge, Menu, WandSparkles } from 'lucide-react';
import { cn } from '../../lib/cn';

export function MobileBottomNav({ onMenuOpen }: { onMenuOpen: () => void }) {
  const pathname = usePathname();
  const slug = pathname.match(/^\/dashboard\/projects\/([^/]+)/)?.[1];
  const items = [
    { label: 'Home', href: '/dashboard', icon: Gauge },
    { label: 'Projects', href: '/dashboard/projects', icon: FolderOpen },
    {
      label: 'Transform',
      href: slug ? `/dashboard/projects/${slug}/transforms` : '/dashboard/projects',
      icon: WandSparkles,
    },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-4 bg-card px-1 lg:hidden"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const needsProject = item.label === 'Transform';
        const active = needsProject && !slug
          ? false
          : item.href === '/dashboard'
            ? pathname === item.href
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-md text-[11px] transition-colors duration-[120ms]',
              active ? 'text-foreground' : 'text-muted-foreground active:bg-secondary',
            )}
          >
            {active ? <span className="absolute top-0 h-0.5 w-6 rounded-full bg-foreground" aria-hidden="true" /> : null}
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMenuOpen}
        className="flex flex-col items-center justify-center gap-1 rounded-md text-[11px] text-muted-foreground transition-colors duration-[120ms] active:bg-secondary active:text-foreground"
        aria-label="Open full menu"
        aria-haspopup="dialog"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
        <span>More</span>
      </button>
    </nav>
  );
}
