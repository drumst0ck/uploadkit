import { highlight } from '@/lib/shiki'
import { HeroCodeWindowClient } from './hero-code-window-client'

// Code samples shown in the hero code window
const ROUTE_CODE = `// app/api/upload/route.ts
import { createUploadKitHandler } from '@uploadkit/next'

const router = createUploadKitHandler({
  imageUploader: f({ image: { maxFileSize: '4MB' } })
    .middleware(async ({ req }) => {
      const user = await auth(req)
      return { userId: user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db.files.create({ userId: metadata.userId, url: file.url })
    }),
})

export const { GET, POST } = router`

const PAGE_CODE = `// app/upload/page.tsx
import { UploadKitProvider, UploadDropzone } from '@uploadkit/react'
import '@uploadkit/react/styles.css'

export default function UploadPage() {
  return (
    <UploadKitProvider apiKey={process.env.UPLOADKIT_KEY}>
      <UploadDropzone
        endpoint="imageUploader"
        onUploadComplete={(files) => {
          console.log('Uploaded:', files.map(f => f.url))
        }}
        onUploadError={(err) => {
          console.error('Upload failed:', err.message)
        }}
      />
    </UploadKitProvider>
  )
}`

// Server Component — Shiki highlights at build time
export async function HeroCodeWindow() {
  const [routeHtml, pageHtml] = await Promise.all([
    highlight(ROUTE_CODE, 'typescript'),
    highlight(PAGE_CODE, 'tsx'),
  ])

  return (
    <HeroCodeWindowClient
      routeHtml={routeHtml}
      pageHtml={pageHtml}
    />
  )
}
