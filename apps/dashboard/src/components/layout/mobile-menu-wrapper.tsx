'use client';

import * as React from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { CommandPalette } from '../command-palette';

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
  children: React.ReactNode;
}

export function MobileMenuWrapper({
  user,
  onSignOut,
  initialProjects,
  children,
}: MobileMenuWrapperProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [cmdkOpen, setCmdkOpen] = React.useState(false);
  const [createProjectOpen, setCreateProjectOpen] = React.useState(false);

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
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        initialProjects={initialProjects}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={user}
          onSignOut={onSignOut}
          onMobileMenuOpen={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      {/* Global command palette — rendered outside the scroll container */}
      <CommandPalette
        open={cmdkOpen}
        onOpenChange={setCmdkOpen}
        onCreateProject={() => setCreateProjectOpen(true)}
      />

      {/* TODO: wire createProjectOpen to the CreateProjectDialog from projects page */}
      {/* The dialog state is hoisted here but the dialog itself lives on the projects page */}
      {createProjectOpen && (
        <div
          role="status"
          aria-live="polite"
          className="sr-only"
        >
          Navigate to projects page to create a project
        </div>
      )}
    </div>
  );
}
