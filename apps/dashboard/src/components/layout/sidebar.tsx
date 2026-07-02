'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { TooltipProvider } from '@uploadkitdev/ui';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Logo } from '../logo';
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
  /** Mobile sheet open state (controlled by header hamburger button) */
  mobileOpen?: boolean | undefined;
  onMobileClose?: (() => void) | undefined;
  isAdmin?: boolean | undefined;
}

// Context for sharing collapsed state with Header
const SidebarContext = React.createContext<{
  collapsed: boolean;
  toggle: () => void;
}>({ collapsed: false, toggle: () => {} });

export function useSidebar() {
  return React.useContext(SidebarContext);
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);

  // Persist sidebar state across page navigations (Pitfall 2 from research)
  React.useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') setCollapsed(true);
  }, []);

  const toggle = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

function SidebarContent({
  collapsed,
  activeProjectSlug,
  initialProjects,
  isAdmin,
}: {
  collapsed: boolean;
  activeProjectSlug?: string | undefined;
  initialProjects?: Project[] | undefined;
  isAdmin?: boolean | undefined;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo / Brand */}
      <div
        className={cn(
          'flex h-14 flex-shrink-0 items-center border-b border-border px-3',
          collapsed ? 'justify-center' : 'gap-2'
        )}
      >
        <Logo size={28} showWordmark={!collapsed} />
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3">
        <TooltipProvider delayDuration={0}>
          <SidebarNav collapsed={collapsed} isAdmin={isAdmin ?? false} />
        </TooltipProvider>
      </div>

      {/* Project Switcher at bottom */}
      <div className="flex-shrink-0 border-t border-border p-2">
        <ProjectSwitcher
          activeSlug={activeProjectSlug}
          initialProjects={initialProjects}
          collapsed={collapsed}
        />
      </div>
    </div>
  );
}

export function Sidebar({
  activeProjectSlug,
  initialProjects,
  mobileOpen = false,
  onMobileClose,
  isAdmin,
}: SidebarProps) {
  const { collapsed } = useSidebar();
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
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
      {/* Desktop sidebar */}
      <aside
        data-collapsed={collapsed}
        className={cn(
          'hidden lg:flex flex-col flex-shrink-0',
          'bg-background border-r border-border',
          'transition-[width] duration-200 ease-in-out',
          collapsed ? 'w-14' : 'w-60'
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          activeProjectSlug={resolvedSlug}
          initialProjects={initialProjects}
          isAdmin={isAdmin}
        />
      </aside>

      {/* Mobile navigation drawer. Portal keeps it above the app shell and bottom dock. */}
      {mobileOpen && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[80] lg:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/65 backdrop-blur-sm"
                onClick={onMobileClose}
                aria-label="Close navigation menu"
              />
              <aside
                ref={mobileDrawerRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="mobile-navigation-title"
                className="absolute inset-y-0 left-0 w-[min(19rem,88vw)] border-r border-border bg-background shadow-2xl"
              >
                <h2 id="mobile-navigation-title" className="sr-only">Navigation menu</h2>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={onMobileClose}
                  className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  aria-label="Close navigation menu"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
                <SidebarContent
                  collapsed={false}
                  activeProjectSlug={resolvedSlug}
                  initialProjects={initialProjects}
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
