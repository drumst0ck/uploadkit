import 'server-only'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { cache } from 'react'

export type BlogCategory =
  | 'Tutorials'
  | 'Comparisons'
  | 'Engineering'
  | 'Changelog'

export const BLOG_CATEGORIES: BlogCategory[] = [
  'Tutorials',
  'Comparisons',
  'Engineering',
  'Changelog',
]

export type Post = {
  slug: string
  title: string
  description: string
  category: BlogCategory
  publishedAt: string // ISO date (YYYY-MM-DD)
  author: string
  tags: string[]
  content: string // raw MDX
}

const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog')

async function readPostFile(filename: string): Promise<Post | null> {
  if (!filename.endsWith('.mdx')) return null
  const slug = filename.replace(/\.mdx$/, '')
  const filePath = path.join(CONTENT_DIR, filename)
  const raw = await fs.readFile(filePath, 'utf8')
  const { data, content } = matter(raw)

  // Minimal validation — surface bad frontmatter clearly instead of silently
  // rendering garbage.
  const required = ['title', 'description', 'category', 'publishedAt', 'author']
  for (const key of required) {
    if (!data[key]) {
      throw new Error(
        `Blog post "${slug}" is missing required frontmatter field: ${key}`,
      )
    }
  }

  const publishedAt =
    data.publishedAt instanceof Date
      ? data.publishedAt.toISOString().slice(0, 10)
      : String(data.publishedAt)

  return {
    slug,
    title: String(data.title),
    description: String(data.description),
    category: data.category as BlogCategory,
    publishedAt,
    author: String(data.author),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    content,
  }
}

export const getAllPosts = cache(async (): Promise<Post[]> => {
  let files: string[]
  try {
    files = await fs.readdir(CONTENT_DIR)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
  const posts = (
    await Promise.all(files.map((f) => readPostFile(f)))
  ).filter((p): p is Post => p !== null)
  return posts.sort((a, b) =>
    a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0,
  )
})

export const getPostBySlug = cache(async (slug: string): Promise<Post | null> => {
  const posts = await getAllPosts()
  return posts.find((p) => p.slug === slug) ?? null
})

export const getPostsByCategory = cache(
  async (category: BlogCategory): Promise<Post[]> => {
    const posts = await getAllPosts()
    return posts.filter((p) => p.category === category)
  },
)

export function formatPostDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
