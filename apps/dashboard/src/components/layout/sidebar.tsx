'use client';

import * as React from 'react';
import { Upload } from 'lucide-react';
import { Sheet, SheetContent } from '@uploadkit/ui';
import { TooltipProvider } from '@uploadkit/ui';
import { cn } from '../../lib/cn';
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
}: {
  collapsed: boolean;
  activeProjectSlug?: string | undefined;
  initialProjects?: Project[] | undefined;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo / Brand */}
      <div
        className={cn(
          'flex h-14 flex-shrink-0 items-center border-b border-white/[0.06] px-3',
          collapsed ? 'justify-center' : 'gap-2'
        )}
      >
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-indigo-500">
          <Upload className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-white">
            UploadKit
          </span>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3">
        <TooltipProvider delayDuration={0}>
          <SidebarNav collapsed={collapsed} />
        </TooltipProvider>
      </div>

      {/* Project Switcher at bottom */}
      <div className="flex-shrink-0 border-t border-white/[0.06] p-2">
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
}: SidebarProps) {
  const { collapsed } = useSidebar();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        data-collapsed={collapsed}
        className={cn(
          'hidden lg:flex flex-col flex-shrink-0',
          'bg-[#0a0a0b] border-r border-white/[0.06]',
          'transition-[width] duration-200 ease-in-out',
          collapsed ? 'w-14' : 'w-60'
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          activeProjectSlug={activeProjectSlug}
          initialProjects={initialProjects}
        />
      </aside>

      {/* Mobile off-canvas drawer */}
      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose?.()}>
        <SheetContent
          side="left"
          className="w-60 border-r border-white/[0.06] bg-[#0a0a0b] p-0"
        >
          <SidebarContent
            collapsed={false}
            activeProjectSlug={activeProjectSlug}
            initialProjects={initialProjects}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
