'use client';

import * as React from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { CommandPalette } from '../command-palette';
import { MobileBottomNav } from './mobile-bottom-nav';
import { Breadcrumbs } from './breadcrumbs';
import { CreateProjectDialog } from '../create-project-dialog';

interface Project {
  _id: string;
  name: string;
  slug: string;
}

interface MobileMenuWrapperProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onSignOut: () => void;
  initialProjects: Project[];
  isAdmin?: boolean;
  children: React.ReactNode;
}

export function MobileMenuWrapper({
  user,
  onSignOut,
  initialProjects,
  isAdmin,
  children,
}: MobileMenuWrapperProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [cmdkOpen, setCmdkOpen] = React.useState(false);
  const [createProjectOpen, setCreateProjectOpen] = React.useState(false);
  const openMobileMenu = React.useCallback(() => setMobileOpen(true), []);
  const closeMobileMenu = React.useCallback(() => setMobileOpen(false), []);

  // Register global cmd+k / ctrl+k keyboard shortcut
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdkOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div data-ui className="min-h-dvh bg-background lg:flex">
      <a
        href="#main"
        className="absolute left-3 top-[-80px] z-[90] rounded-full bg-primary px-4 py-2.5 text-sm text-primary-foreground focus:top-3"
      >
        Skip to content
      </a>
      <Sidebar
        initialProjects={initialProjects}
        user={user}
        onSignOut={onSignOut}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobileMenu}
        isAdmin={isAdmin}
      />
      <div className="min-w-0 flex-1">
        <Header
          onMobileMenuOpen={openMobileMenu}
          onSearchOpen={() => setCmdkOpen(true)}
        />
        <main
          id="main"
          className="dashboard-canvas min-w-0 overflow-x-auto px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8"
        >
          <div className="w-full max-w-[1500px]">
            <Breadcrumbs />
            {children}
          </div>
        </main>
      </div>

      <MobileBottomNav onMenuOpen={openMobileMenu} />

      {/* Global command palette — rendered outside the scroll container */}
      <CommandPalette
        open={cmdkOpen}
        onOpenChange={setCmdkOpen}
        onCreateProject={() => setCreateProjectOpen(true)}
      />

      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
      />
    </div>
  );
}
