import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';

const BASE_URL = 'https://docs.uploadkit.dev';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Root + docs index always included
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/docs`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];

  // Every MDX page enumerated by Fumadocs source — URLs already include /docs prefix
  const pageEntries: MetadataRoute.Sitemap = source.getPages().map((page) => ({
    url: `${BASE_URL}${page.url}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticEntries, ...pageEntries];
}
