import { highlight } from '@/lib/shiki'
import { CodeDemoClient } from './code-demo-client'

// ── Code examples (hardcoded constants — safe for dangerouslySetInnerHTML) ──

const NEXTJS_CODE = `// app/api/upload/route.ts
import { createUploadKitHandler } from '@uploadkitdev/next'

const router = createUploadKitHandler({
  imageUploader: f({ image: { maxFileSize: '4MB' } })
    .middleware(() => ({ userId: 'user_123' }))
    .onUploadComplete(({ file }) => {
      console.log('Uploaded:', file.url)
    }),
})

export const { GET, POST } = router`

const REACT_CODE = `// In your React component
import { UploadKitProvider, UploadDropzone } from '@uploadkitdev/react'
import '@uploadkitdev/react/styles.css'

export function MyUploader() {
  return (
    <UploadKitProvider apiKey={process.env.UPLOADKIT_KEY}>
      <UploadDropzone
        endpoint="imageUploader"
        onUploadComplete={(files) => {
          console.log('Done!', files)
        }}
      />
    </UploadKitProvider>
  )
}`

const API_CODE = `# 1. Request a presigned upload URL
curl -X POST https://api.uploadkit.dev/v1/upload \\
  -H "Authorization: Bearer uk_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"filename":"photo.jpg","contentType":"image/jpeg","size":204800}'

# 2. Upload directly to storage (no server bottleneck)
curl -X PUT "$PRESIGNED_URL" \\
  -H "Content-Type: image/jpeg" \\
  --data-binary @photo.jpg

# 3. Confirm upload complete
curl -X POST https://api.uploadkit.dev/v1/upload/confirm \\
  -H "Authorization: Bearer uk_live_your_key" \\
  -d '{"uploadId":"upl_abc123"}'`

// ── Server Component — highlights all 3 tabs at build time ──

export async function CodeDemo() {
  const [nextjsHtml, reactHtml, apiHtml] = await Promise.all([
    highlight(NEXTJS_CODE, 'typescript'),
    highlight(REACT_CODE, 'tsx'),
    highlight(API_CODE, 'bash'),
  ])

  return (
    <section id="code-demo" className="code-demo-section">
      <div className="container">
        <div className="section-header" data-animate>
          <p className="section-label">Developer experience</p>
          <h2 className="section-title">Three lines. That&apos;s it.</h2>
          <p className="section-subtitle">
            Add production-ready file uploads to any app in minutes.
            Type-safe, framework-agnostic, and beautiful by default.
          </p>
        </div>

        <CodeDemoClient
          nextjsHtml={nextjsHtml}
          reactHtml={reactHtml}
          apiHtml={apiHtml}
        />
      </div>
    </section>
  )
}
