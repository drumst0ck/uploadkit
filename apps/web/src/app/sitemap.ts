import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';

const BASE_URL = 'https://uploadkit.dev';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const posts = await getAllPosts();

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/changelog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    ...postEntries,
  ];
}
