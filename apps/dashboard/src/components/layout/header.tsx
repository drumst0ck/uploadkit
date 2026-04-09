'use client';

import * as React from 'react';
import { Menu, Search } from 'lucide-react';
import { Button, Avatar, AvatarImage, AvatarFallback } from '@uploadkitdev/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@uploadkitdev/ui';
import { ThemeToggle } from '../theme-toggle';
import { Breadcrumbs } from './breadcrumbs';
import { useSidebar } from './sidebar';

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onSignOut: () => void;
  onMobileMenuOpen: () => void;
  onSearchOpen?: () => void;
}

function getUserInitials(name?: string | null, email?: string | null): string {
  const source = name ?? email ?? '?';
  return source
    .split(' ')
    .map((s) => s[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Header({ user, onSignOut, onMobileMenuOpen, onSearchOpen }: HeaderProps) {
  const { toggle } = useSidebar();
  const initials = getUserInitials(user.name, user.email);

  return (
    <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      {/* Mobile hamburger — triggers off-canvas Sheet */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground lg:hidden"
        onClick={onMobileMenuOpen}
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Desktop sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden h-8 w-8 text-muted-foreground hover:text-foreground lg:flex"
        onClick={toggle}
        aria-label="Toggle sidebar"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Breadcrumbs — auto-derived from URL */}
      <div className="flex-1">
        <Breadcrumbs />
      </div>

      {/* Right-side actions */}
      <div className="flex items-center gap-1">
        {/* Search trigger (cmd+k hint) */}
        <Button
          variant="ghost"
          size="sm"
          className="hidden h-8 gap-2 text-muted-foreground hover:text-foreground sm:flex"
          aria-label="Search (⌘K)"
          onClick={onSearchOpen}
        >
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs">Search</span>
          <kbd className="hidden rounded border border-border bg-accent px-1.5 py-0.5 text-[10px] text-muted-foreground lg:inline">
            ⌘K
          </kbd>
        </Button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User avatar + dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full focus-visible:ring-1 focus-visible:ring-indigo-500"
              aria-label="User menu"
            >
              <Avatar className="h-7 w-7">
                {user.image ? (
                  <AvatarImage src={user.image} alt={user.name ?? 'User avatar'} />
                ) : null}
                <AvatarFallback className="bg-indigo-500/20 text-xs font-semibold text-indigo-300">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 border-border bg-card"
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                {user.name && (
                  <span className="text-sm font-medium text-foreground">{user.name}</span>
                )}
                {user.email && (
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-accent" />
            <DropdownMenuItem
              onClick={onSignOut}
              className="text-muted-foreground focus:bg-accent focus:text-foreground"
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
