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
          background:
            'radial-gradient(1200px 600px at 20% 10%, rgba(99,102,241,0.35), transparent 60%), radial-gradient(900px 500px at 90% 90%, rgba(129,140,248,0.22), transparent 55%), #0a0a0b',
          fontFamily: 'sans-serif',
          color: '#fafafa',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '10px 22px',
              borderRadius: '999px',
              background: 'rgba(99,102,241,0.16)',
              color: '#c7d2fe',
              border: '1px solid rgba(129,140,248,0.35)',
              fontSize: '26px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            {category}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: '76px',
            lineHeight: 1.1,
            fontWeight: 800,
            letterSpacing: '-0.035em',
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
            color: '#a1a1aa',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              color: '#fafafa',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background:
                  'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                boxShadow: '0 0 60px -10px #6366f1',
              }}
            />
            UploadKit
          </div>
          <div style={{ display: 'flex' }}>uploadkit.dev/blog</div>
        </div>
      </div>
    ),
    { ...size },
  )
}
