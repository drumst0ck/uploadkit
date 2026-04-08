'use client';

import * as React from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';

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
    </div>
  );
}
