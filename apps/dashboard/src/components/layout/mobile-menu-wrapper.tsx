'use client';

import * as React from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { CommandPalette } from '../command-palette';
import { MobileBottomNav } from './mobile-bottom-nav';
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
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar
        initialProjects={initialProjects}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobileMenu}
        isAdmin={isAdmin}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={user}
          onSignOut={onSignOut}
          onMobileMenuOpen={openMobileMenu}
          onSearchOpen={() => setCmdkOpen(true)}
        />
        <main className="dashboard-canvas flex-1 overflow-y-auto px-4 pb-24 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-8 xl:px-10">
          <div className="mx-auto w-full max-w-[1500px]">{children}</div>
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
