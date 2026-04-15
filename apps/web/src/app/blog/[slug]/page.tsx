import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { compileMDX } from 'next-mdx-remote/rsc'
import rehypePrettyCode, { type Options as RehypePrettyCodeOptions } from 'rehype-pretty-code'
import Navbar from '@/components/nav/navbar'
import { Footer } from '@/components/footer/footer'
import { formatPostDate, getAllPosts, getPostBySlug } from '@/lib/blog'

const BASE_URL = 'https://uploadkit.dev'

const rehypePrettyCodeOptions: RehypePrettyCodeOptions = {
  theme: 'github-dark',
  keepBackground: false,
  defaultLang: 'plaintext',
}

type Params = Promise<{ slug: string }>

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Params
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return {}

  const url = `${BASE_URL}/blog/${post.slug}`
  return {
    title: `${post.title} — UploadKit blog`,
    description: post.description,
    alternates: { canonical: url },
    authors: [{ name: post.author }],
    keywords: post.tags,
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: 'article',
      publishedTime: new Date(post.publishedAt).toISOString(),
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  }
}

const mdxComponents = {
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props} className={`blog-link ${props.className ?? ''}`.trim()} />
  ),
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  const { content } = await compileMDX({
    source: post.content,
    components: mdxComponents,
    options: {
      parseFrontmatter: false,
      mdxOptions: {
        rehypePlugins: [[rehypePrettyCode, rehypePrettyCodeOptions]],
      },
    },
  })

  const url = `${BASE_URL}/blog/${post.slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: new Date(post.publishedAt).toISOString(),
    dateModified: new Date(post.publishedAt).toISOString(),
    author: { '@type': 'Organization', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'UploadKit',
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/favicon.svg`,
      },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: `${url}/opengraph-image`,
    keywords: post.tags.join(', '),
    articleSection: post.category,
  }

  return (
    <>
      <Navbar />
      <main>
        <article className="blog-post">
          <div className="container blog-post-container">
            <nav className="blog-breadcrumb" aria-label="Breadcrumb">
              <Link href="/blog">← All posts</Link>
            </nav>

            <header className="blog-post-header">
              <span className="blog-card-category">{post.category}</span>
              <h1 className="blog-post-title">{post.title}</h1>
              <p className="blog-post-description">{post.description}</p>
              <div className="blog-post-meta">
                <time dateTime={post.publishedAt}>
                  {formatPostDate(post.publishedAt)}
                </time>
                <span aria-hidden="true">·</span>
                <span>{post.author}</span>
              </div>
            </header>

            <div className="blog-post-body">{content}</div>
          </div>
        </article>
      </main>
      <Footer />
      <script
        type="application/ld+json"
        // JSON.stringify is safe here — content comes from trusted MDX frontmatter
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  )
}
