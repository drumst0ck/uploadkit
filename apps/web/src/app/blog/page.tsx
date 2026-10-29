import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteShell } from '@/components/site/shell'
import {
  BLOG_CATEGORIES,
  formatPostDate,
  getAllPosts,
  type BlogCategory,
} from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Blog — UploadKit',
  description:
    'Tutorials, comparisons and engineering notes from the team building UploadKit — file uploads for developers.',
  alternates: {
    canonical: 'https://uploadkit.dev/blog',
    types: {
      'application/rss+xml': 'https://uploadkit.dev/blog/rss.xml',
    },
  },
  openGraph: {
    title: 'UploadKit Blog',
    description:
      'Tutorials, comparisons and engineering notes from the team building UploadKit.',
    url: 'https://uploadkit.dev/blog',
    type: 'website',
  },
}

type SearchParams = Promise<{ category?: string }>

function isCategory(value: string | undefined): value is BlogCategory {
  return (
    !!value && (BLOG_CATEGORIES as string[]).includes(value)
  )
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { category } = await searchParams
  const activeCategory = isCategory(category) ? category : null

  const posts = await getAllPosts()
  const visible = activeCategory
    ? posts.filter((p) => p.category === activeCategory)
    : posts

  return (
    <SiteShell>
      <section className="page-head" aria-labelledby="blog-title">
        <h1 className="page-title enter" id="blog-title">The UploadKit blog</h1>
        <div className="col">
          <p className="lead enter" style={{ '--i': 1 } as React.CSSProperties}>
            Tutorials, comparisons and engineering notes from the team building file uploads for developers.
          </p>
        </div>
      </section>

      <nav className="col filters" aria-label="Filter posts by category" style={{ marginTop: 64 }}>
        <Link href="/blog" aria-current={activeCategory === null ? 'page' : undefined}>
          All
        </Link>
        {BLOG_CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/blog?category=${encodeURIComponent(cat)}`}
            aria-current={activeCategory === cat ? 'page' : undefined}
          >
            {cat}
          </Link>
        ))}
      </nav>

      <section aria-label="Posts" style={{ marginTop: 48 }}>
        {visible.length === 0 ? (
          <p className="col soft">No posts yet in this category. Check back soon.</p>
        ) : (
          <ul className="col posts">
            {visible.map((post) => (
              <li key={post.slug}>
                <h2>
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                <p className="soft">{post.description}</p>
                <p className="soft small">
                  {post.category} · <time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt)}</time> · {post.author}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </SiteShell>
  )
}
