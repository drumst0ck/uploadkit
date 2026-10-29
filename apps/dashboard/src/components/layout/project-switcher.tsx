'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';

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
}

/** Native select (pd kit): "All projects" goes to the account overview. */
export function ProjectSwitcher({ activeSlug, initialProjects = [] }: ProjectSwitcherProps) {
  const router = useRouter();
  const id = React.useId();

  const { data: projects = initialProjects } = useSWR<Project[]>('/api/internal/projects', {
    fallbackData: initialProjects,
  });

  const value = activeSlug && projects.some((p) => p.slug === activeSlug) ? activeSlug : '';

  return (
    <div className="pd-field">
      <label className="pd-label" htmlFor={id}>
        Project
      </label>
      <div className="pd-select-wrap">
        <select
          id={id}
          className="pd-select"
          value={value}
          onChange={(e) => {
            const slug = e.target.value;
            router.push(slug ? `/dashboard/projects/${slug}` : '/dashboard');
          }}
        >
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project._id} value={project.slug}>
              {project.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
