import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/nav/navbar'
import { Footer } from '@/components/footer/footer'
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
    <>
      <Navbar />
      <main>
        <section className="blog-hero">
          <div className="container">
            <h1 className="blog-title">The UploadKit blog</h1>
            <p className="blog-subtitle">
              Tutorials, comparisons and engineering notes from the team
              building file uploads for developers.
            </p>
          </div>
        </section>

        <section className="blog-filters">
          <div className="container">
            <nav className="blog-filter-row" aria-label="Filter posts by category">
              <Link
                href="/blog"
                className={`blog-filter-pill${activeCategory === null ? ' is-active' : ''}`}
                aria-current={activeCategory === null ? 'page' : undefined}
              >
                All
              </Link>
              {BLOG_CATEGORIES.map((cat) => (
                <Link
                  key={cat}
                  href={`/blog?category=${encodeURIComponent(cat)}`}
                  className={`blog-filter-pill${activeCategory === cat ? ' is-active' : ''}`}
                  aria-current={activeCategory === cat ? 'page' : undefined}
                >
                  {cat}
                </Link>
              ))}
            </nav>
          </div>
        </section>

        <section className="blog-list">
          <div className="container">
            {visible.length === 0 ? (
              <p className="blog-empty">
                No posts yet in this category. Check back soon.
              </p>
            ) : (
              <ul className="blog-grid">
                {visible.map((post) => (
                  <li key={post.slug} className="blog-card">
                    <Link href={`/blog/${post.slug}`} className="blog-card-link">
                      <span className="blog-card-category">{post.category}</span>
                      <h2 className="blog-card-title">{post.title}</h2>
                      <p className="blog-card-description">{post.description}</p>
                      <div className="blog-card-meta">
                        <time dateTime={post.publishedAt}>
                          {formatPostDate(post.publishedAt)}
                        </time>
                        <span aria-hidden="true">·</span>
                        <span>{post.author}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
