import { ImageResponse } from 'next/og'
import { getPostBySlug } from '@/lib/blog'

export const runtime = 'nodejs'
export const alt = 'UploadKit blog post'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  const title = post?.title ?? 'UploadKit blog'
  const category = post?.category ?? 'Blog'

  // Monochrome identity: black field, white type, white mark. No gradient, glow or accent colour.
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background: '#000000',
          fontFamily: 'sans-serif',
          color: '#ededed',
        }}
      >
        <div style={{ display: 'flex', fontSize: '28px', color: '#a1a1a1' }}>{category}</div>

        <div
          style={{
            display: 'flex',
            fontSize: '72px',
            lineHeight: 1.08,
            fontWeight: 500,
            letterSpacing: '-0.04em',
            maxWidth: '1000px',
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '28px',
            color: '#a1a1a1',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              color: '#ededed',
              fontWeight: 500,
              letterSpacing: '-0.01em',
            }}
          >
            <svg width="44" height="44" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="8" fill="#ffffff" />
              <polygon points="16,7 23,17 9,17" fill="#000000" />
              <rect x="9" y="19" width="14" height="4" rx="1.5" fill="#000000" fillOpacity="0.55" />
            </svg>
            UploadKit
          </div>
          <div style={{ display: 'flex' }}>uploadkit.dev/blog</div>
        </div>
      </div>
    ),
    { ...size },
  )
}
