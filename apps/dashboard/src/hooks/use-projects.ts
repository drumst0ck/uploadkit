'use client';

import useSWR from 'swr';

interface Project {
  _id: string;
  name: string;
  slug: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

async function fetcher(url: string): Promise<Project[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json() as Promise<Project[]>;
}

export function useProjects() {
  const { data, isLoading, error, mutate } = useSWR<Project[]>(
    '/api/internal/projects',
    fetcher
  );

  return {
    projects: data ?? [],
    isLoading,
    error,
    mutate,
  };
}

export type { Project };
