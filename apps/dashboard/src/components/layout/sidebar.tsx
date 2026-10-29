'use client';

import * as React from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { Logo } from '../logo';
import { ThemeToggle } from '../theme-toggle';
import { SidebarNav } from './sidebar-nav';
import { ProjectSwitcher } from './project-switcher';

interface Project {
  _id: string;
  name: string;
  slug: string;
}

interface SidebarProps {
  activeProjectSlug?: string | undefined;
  initialProjects?: Project[] | undefined;
  user?: { name?: string | null; email?: string | null } | undefined;
  onSignOut?: (() => void) | undefined;
  /** Mobile sheet open state (controlled by the top bar menu button) */
  mobileOpen?: boolean | undefined;
  onMobileClose?: (() => void) | undefined;
  isAdmin?: boolean | undefined;
}

const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL ?? 'https://docs.uploadkit.dev';

function SidebarContent({
  activeProjectSlug,
  initialProjects,
  user,
  onSignOut,
  isAdmin,
}: Pick<SidebarProps, 'activeProjectSlug' | 'initialProjects' | 'user' | 'onSignOut' | 'isAdmin'>) {
  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-3 py-4">
      <Link
        href="/dashboard"
        aria-label="UploadKit, overview"
        className="flex min-h-11 items-center rounded-md px-2"
      >
        <Logo size={28} />
      </Link>

      <ProjectSwitcher activeSlug={activeProjectSlug} initialProjects={initialProjects} />

      <SidebarNav isAdmin={isAdmin ?? false} />

      <div className="mt-auto grid gap-1">
        <a
          href={DOCS_URL}
          className="flex h-10 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors duration-[120ms] hover:text-foreground hover:underline"
        >
          Docs &rarr;
        </a>
        <ThemeToggle />
        {user?.email || user?.name ? (
          <p className="truncate px-3 pt-2 text-sm text-muted-foreground" title={user.email ?? user.name ?? ''}>
            {user.email ?? user.name}
          </p>
        ) : null}
        {onSignOut ? (
          <button
            type="button"
            onClick={onSignOut}
            className="pd-button pd-button--ghost justify-start"
            style={{ minHeight: '2.5rem', justifyContent: 'flex-start', padding: '0 0.75rem' }}
          >
            Sign out
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function Sidebar({
  activeProjectSlug,
  initialProjects,
  user,
  onSignOut,
  mobileOpen = false,
  onMobileClose,
  isAdmin,
}: SidebarProps) {
  const pathname = usePathname();
  const routeSlug = pathname.match(/^\/dashboard\/projects\/([^/]+)/)?.[1];
  const resolvedSlug = activeProjectSlug ?? routeSlug;
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (!mobileOpen) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onMobileClose?.();
      if (event.key === 'Tab') {
        const focusable = mobileDrawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), select, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onMobileClose]);

  React.useEffect(() => {
    onMobileClose?.();
  }, [pathname, onMobileClose]);

  return (
    <>
      {/* Desktop sidebar: surface on canvas, separated by a tone step, no border */}
      <aside
        aria-label="Sidebar"
        className="sticky top-0 hidden h-dvh w-[232px] flex-shrink-0 bg-card lg:block"
      >
        <SidebarContent
          activeProjectSlug={resolvedSlug}
          initialProjects={initialProjects}
          user={user}
          onSignOut={onSignOut}
          isAdmin={isAdmin}
        />
      </aside>

      {/* Mobile navigation drawer. Portal keeps it above the app shell and bottom dock. */}
      {mobileOpen && typeof document !== 'undefined'
        ? createPortal(
            <div data-ui className="fixed inset-0 z-[80] lg:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/80"
                onClick={onMobileClose}
                aria-label="Close navigation menu"
              />
              <aside
                ref={mobileDrawerRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="mobile-navigation-title"
                className="absolute inset-y-0 left-0 w-[min(19rem,88vw)] bg-card"
              >
                <h2 id="mobile-navigation-title" className="sr-only">Navigation menu</h2>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={onMobileClose}
                  className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Close navigation menu"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
                <SidebarContent
                  activeProjectSlug={resolvedSlug}
                  initialProjects={initialProjects}
                  user={user}
                  onSignOut={onSignOut}
                  isAdmin={isAdmin}
                />
              </aside>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
