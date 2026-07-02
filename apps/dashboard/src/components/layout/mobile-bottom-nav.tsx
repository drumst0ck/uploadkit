'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderOpen, Gauge, Menu, Upload, WandSparkles } from 'lucide-react';
import { cn } from '../../lib/cn';

export function MobileBottomNav({ onMenuOpen }: { onMenuOpen: () => void }) {
  const pathname = usePathname();
  const slug = pathname.match(/^\/dashboard\/projects\/([^/]+)/)?.[1];
  const items = [
    { label: 'Home', href: '/dashboard', icon: Gauge },
    { label: 'Projects', href: '/dashboard/projects', icon: FolderOpen },
    {
      label: 'Files',
      href: slug ? `/dashboard/projects/${slug}/files` : '/dashboard/projects',
      icon: Upload,
    },
    {
      label: 'Transform',
      href: slug ? `/dashboard/projects/${slug}/transforms` : '/dashboard/projects',
      icon: WandSparkles,
    },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-3 bottom-3 z-40 grid h-16 grid-cols-5 rounded-2xl border border-border/80 bg-background/92 px-1 shadow-2xl shadow-black/20 backdrop-blur-xl lg:hidden"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const needsProject = item.label === 'Files' || item.label === 'Transform';
        const active = needsProject && !slug
          ? false
          : item.href === '/dashboard'
            ? pathname === item.href
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              'relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-colors',
              active ? 'text-indigo-400' : 'text-muted-foreground active:bg-accent',
            )}
          >
            {active ? <span className="absolute top-0 h-0.5 w-5 rounded-full bg-indigo-400" /> : null}
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMenuOpen}
        className="flex flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium text-muted-foreground active:bg-accent"
        aria-label="Open full menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
        <span>More</span>
      </button>
    </nav>
  );
}
