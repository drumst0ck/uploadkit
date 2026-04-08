'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  BarChart3,
  CreditCard,
  Settings,
  Files,
  KeyRound,
  Route,
  ScrollText,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@uploadkit/ui';
import { cn } from '../../lib/cn';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const TOP_NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/dashboard/projects', icon: FolderOpen },
  { label: 'Usage', href: '/dashboard/usage', icon: BarChart3 },
  { label: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

// Project-scoped nav items that appear when on a /dashboard/projects/[slug]/* route
const PROJECT_NAV_ITEMS: NavItem[] = [
  { label: 'Files', href: 'files', icon: Files },
  { label: 'API Keys', href: 'keys', icon: KeyRound },
  { label: 'File Routes', href: 'routes', icon: Route },
  { label: 'Logs', href: 'logs', icon: ScrollText },
];

interface SidebarNavProps {
  collapsed: boolean;
}

function NavItemLink({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
        isActive
          ? 'bg-white/[0.06] text-white'
          : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

export function SidebarNav({ collapsed }: SidebarNavProps) {
  const pathname = usePathname();

  // Detect if we are on a project-specific route: /dashboard/projects/[slug]/*
  const projectRouteMatch = pathname.match(
    /^\/dashboard\/projects\/([^/]+)(\/.*)?$/
  );
  const activeProjectSlug = projectRouteMatch?.[1];
  const projectBasePath = activeProjectSlug
    ? `/dashboard/projects/${activeProjectSlug}`
    : null;

  function isActive(href: string): boolean {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  return (
    <nav className="flex flex-col gap-1 px-2" aria-label="Main navigation">
      {TOP_NAV_ITEMS.map((item) => (
        <NavItemLink
          key={item.href}
          item={item}
          isActive={isActive(item.href)}
          collapsed={collapsed}
        />
      ))}

      {/* Project-scoped sub-nav — visible when inside a project route */}
      {projectBasePath && (
        <div className={cn('mt-2', !collapsed && 'ml-2 border-l border-white/[0.06] pl-2')}>
          {!collapsed && (
            <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-600">
              Project
            </p>
          )}
          {PROJECT_NAV_ITEMS.map((item) => {
            const fullHref = `${projectBasePath}/${item.href}`;
            return (
              <NavItemLink
                key={item.href}
                item={{ ...item, href: fullHref }}
                isActive={pathname.startsWith(fullHref)}
                collapsed={collapsed}
              />
            );
          })}
        </div>
      )}
    </nav>
  );
}
