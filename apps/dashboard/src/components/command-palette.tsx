'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
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
  PlusCircle,
  Sun,
  Moon,
  LogOut,
  Search,
} from 'lucide-react';
// Theme toggle without next-themes (removed due to Next.js 16 hydration bug)
import { signOut } from 'next-auth/react';
import { useProjects } from '../hooks/use-projects';
import useSWR from 'swr';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchFile {
  _id: string;
  name: string;
  projectId: string;
  projectSlug: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject?: () => void;
}

// ─── File search fetcher (debounced, max 10 results) ─────────────────────────

async function searchFetcher(url: string): Promise<SearchFile[]> {
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json() as Promise<SearchFile[]>;
}

function useFileSearch(query: string) {
  // T-06-18: only search when query >= 3 chars; debounce handled by state delay
  const key = query.length >= 3 ? `/api/internal/search?q=${encodeURIComponent(query)}&limit=10` : null;
  const { data } = useSWR<SearchFile[]>(key, searchFetcher, {
    keepPreviousData: false,
    dedupingInterval: 300,
  });
  return data ?? [];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Debounce hook for search input to satisfy T-06-18
function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState<T>(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommandPalette({ open, onOpenChange, onCreateProject }: CommandPaletteProps) {
  const router = useRouter();
  const [isDark, setIsDark] = React.useState(true);
  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
  };
  const { projects } = useProjects();

  const [inputValue, setInputValue] = React.useState('');
  const debouncedQuery = useDebounced(inputValue, 300);
  const searchResults = useFileSearch(debouncedQuery);

  // Reset input on close
  React.useEffect(() => {
    if (!open) setInputValue('');
  }, [open]);

  function navigate(href: string) {
    router.push(href);
    onOpenChange(false);
  }

  function handleToggleTheme() {
    toggleTheme();
    onOpenChange(false);
  }

  async function handleSignOut() {
    onOpenChange(false);
    await signOut({ callbackUrl: '/login' });
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Global command palette"
      // Overlay: fixed full-screen backdrop with dark bg + blur
      overlayClassName="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      // Content: centered panel (cmdk uses contentClassName for the Command wrapper div)
      contentClassName="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-white/[0.06] bg-[#0a0a0b] shadow-2xl"
    >
      {/* Search input row */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <Search className="h-4 w-4 flex-shrink-0 text-zinc-500" aria-hidden="true" />
        <Command.Input
          value={inputValue}
          onValueChange={setInputValue}
          placeholder="Type a command or search..."
          className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          aria-label="Search commands"
        />
        <kbd className="hidden rounded border border-white/[0.08] px-1.5 py-0.5 text-xs text-zinc-600 sm:inline-flex">
          ESC
        </kbd>
      </div>

      <Command.List className="max-h-80 overflow-y-auto py-2">
        <Command.Empty className="py-8 text-center text-sm text-zinc-500">
          No results found.
        </Command.Empty>

        {/* Navigation group */}
        <Command.Group
          heading="Navigation"
          className="px-2 [&_[cmdk-group-heading]]:mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-zinc-600"
        >
          <PaletteItem
            icon={LayoutDashboard}
            label="Dashboard Overview"
            onSelect={() => navigate('/dashboard')}
          />
          <PaletteItem
            icon={FolderOpen}
            label="Projects"
            onSelect={() => navigate('/dashboard/projects')}
          />
          <PaletteItem
            icon={BarChart3}
            label="Usage"
            onSelect={() => navigate('/dashboard/usage')}
          />
          <PaletteItem
            icon={CreditCard}
            label="Billing"
            onSelect={() => navigate('/dashboard/billing')}
          />
          <PaletteItem
            icon={Settings}
            label="Settings"
            onSelect={() => navigate('/dashboard/settings')}
          />

          {/* Per-project sub-navigation */}
          {projects.map((project) => (
            <React.Fragment key={project._id}>
              <PaletteItem
                icon={Files}
                label={`${project.name} — Files`}
                onSelect={() => navigate(`/dashboard/projects/${project.slug}/files`)}
              />
              <PaletteItem
                icon={KeyRound}
                label={`${project.name} — API Keys`}
                onSelect={() => navigate(`/dashboard/projects/${project.slug}/keys`)}
              />
              <PaletteItem
                icon={ScrollText}
                label={`${project.name} — Logs`}
                onSelect={() => navigate(`/dashboard/projects/${project.slug}/logs`)}
              />
              <PaletteItem
                icon={Route}
                label={`${project.name} — Routes`}
                onSelect={() => navigate(`/dashboard/projects/${project.slug}/routes`)}
              />
              <PaletteItem
                icon={Settings}
                label={`${project.name} — Settings`}
                onSelect={() => navigate(`/dashboard/projects/${project.slug}/settings`)}
              />
            </React.Fragment>
          ))}
        </Command.Group>

        {/* Actions group */}
        <Command.Group
          heading="Actions"
          className="px-2 [&_[cmdk-group-heading]]:mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-zinc-600"
        >
          <PaletteItem
            icon={PlusCircle}
            label="Create Project"
            onSelect={() => {
              onOpenChange(false);
              onCreateProject?.();
            }}
          />
          <PaletteItem
            icon={isDark ? Sun : Moon}
            label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            onSelect={handleToggleTheme}
          />
          <PaletteItem
            icon={LogOut}
            label="Sign Out"
            onSelect={() => void handleSignOut()}
            destructive
          />
        </Command.Group>

        {/* File search results — only when query >= 3 chars */}
        {debouncedQuery.length >= 3 && searchResults.length > 0 && (
          <Command.Group
            heading="Files"
            className="px-2 [&_[cmdk-group-heading]]:mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-zinc-600"
          >
            {searchResults.map((file) => (
              <PaletteItem
                key={file._id}
                icon={Files}
                label={file.name}
                onSelect={() => navigate(`/dashboard/projects/${file.projectSlug}/files`)}
              />
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}

// ─── Palette item sub-component ───────────────────────────────────────────────

interface PaletteItemProps {
  icon: React.ElementType;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

function PaletteItem({ icon: Icon, label, onSelect, destructive = false }: PaletteItemProps) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={[
        'flex cursor-default items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
        'outline-none',
        'aria-selected:bg-white/[0.06] aria-selected:text-white',
        destructive
          ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300 aria-selected:bg-red-500/10 aria-selected:text-red-300'
          : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white',
      ].join(' ')}
    >
      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </Command.Item>
  );
}
