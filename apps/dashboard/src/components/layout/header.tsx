'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, Search } from 'lucide-react';
import { Logo } from '../logo';

interface HeaderProps {
  onMobileMenuOpen: () => void;
  onSearchOpen?: () => void;
}

/**
 * Phone and tablet top bar. On desktop the sidebar carries the logo, project
 * switcher, theme and sign-out, so no header is rendered there.
 */
export function Header({ onMobileMenuOpen, onSearchOpen }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-card px-3 lg:hidden">
      <button
        type="button"
        className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        onClick={onMobileMenuOpen}
        aria-label="Open menu"
        aria-haspopup="dialog"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      <Link href="/dashboard" aria-label="UploadKit, overview" className="flex min-h-11 flex-1 items-center">
        <Logo size={24} />
      </Link>
      <button
        type="button"
        className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        onClick={onSearchOpen}
        aria-label="Search"
      >
        <Search className="h-5 w-5" aria-hidden="true" />
      </button>
    </header>
  );
}
