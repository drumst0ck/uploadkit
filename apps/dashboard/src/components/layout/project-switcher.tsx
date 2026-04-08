'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ChevronDown, FolderOpen, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@uploadkit/ui';
import { cn } from '../../lib/cn';

interface Project {
  _id: string;
  name: string;
  slug: string;
}

interface ProjectSwitcherProps {
  /** Current active project slug from URL, if any */
  activeSlug?: string | undefined;
  /** Initial project data from server-side fetch (avoids loading flash) */
  initialProjects?: Project[] | undefined;
  /** Whether sidebar is collapsed (icon-only mode) */
  collapsed?: boolean | undefined;
}

export function ProjectSwitcher({
  activeSlug,
  initialProjects = [],
  collapsed = false,
}: ProjectSwitcherProps) {
  const router = useRouter();

  const { data: projects = initialProjects } = useSWR<Project[]>(
    '/api/internal/projects',
    { fallbackData: initialProjects }
  );

  const active = projects.find((p) => p.slug === activeSlug) ?? projects[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm',
          'text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500',
          collapsed && 'justify-center px-0'
        )}
      >
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-indigo-500/20 text-xs font-semibold text-indigo-300">
          {active ? active.name[0]?.toUpperCase() ?? 'P' : 'P'}
        </div>
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left font-medium">
              {active?.name ?? 'Select project'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="top"
        className="w-56 border-white/[0.08] bg-[#141416]"
      >
        <DropdownMenuLabel className="text-xs text-zinc-500">
          Projects
        </DropdownMenuLabel>
        {projects.map((project) => (
          <DropdownMenuItem
            key={project._id}
            onClick={() => router.push(`/dashboard/projects/${project.slug}`)}
            className={cn(
              'gap-2 text-zinc-300 focus:bg-white/[0.06] focus:text-white',
              project.slug === activeSlug && 'text-white'
            )}
          >
            <FolderOpen className="h-4 w-4 opacity-60" />
            <span className="truncate">{project.name}</span>
          </DropdownMenuItem>
        ))}
        {projects.length > 0 && <DropdownMenuSeparator className="bg-white/[0.06]" />}
        <DropdownMenuItem
          onClick={() => router.push('/dashboard/projects/new')}
          className="gap-2 text-zinc-400 focus:bg-white/[0.06] focus:text-white"
        >
          <Plus className="h-4 w-4" />
          <span>New project</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
