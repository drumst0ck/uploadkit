import { getAllPosts } from '@/lib/blog'

const BASE_URL = 'https://uploadkit.dev'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const posts = await getAllPosts()
  const lastBuild = new Date().toUTCString()

  const items = posts
    .map((post) => {
      const url = `${BASE_URL}/blog/${post.slug}`
      const pubDate = new Date(post.publishedAt).toUTCString()
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.description)}</description>
      <category>${escapeXml(post.category)}</category>
      <author>noreply@uploadkit.dev (${escapeXml(post.author)})</author>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>UploadKit Blog</title>
    <link>${BASE_URL}/blog</link>
    <description>Tutorials, comparisons and engineering notes from the team building UploadKit — file uploads for developers.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${BASE_URL}/blog/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
