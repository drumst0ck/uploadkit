import { highlight } from '@/lib/shiki'

interface CodeBlockProps {
  code: string
  /** shiki lang: 'typescript' | 'tsx' | 'bash' (others fall back to plain text). */
  lang?: 'typescript' | 'tsx' | 'bash' | 'text'
  /** Filename / label shown above the code. */
  title?: string
}

/** Static, build-time highlighted code (async server component). Code must be a constant. */
export async function CodeBlock({ code, lang = 'tsx', title }: CodeBlockProps) {
  const trimmed = code.replace(/^\n+|\s+$/g, '')
  let html: string | null = null
  if (lang !== 'text') {
    try {
      html = await highlight(trimmed, lang)
    } catch {
      html = null
    }
  }
  return (
    <figure className="code">
      {title && <figcaption>{title}</figcaption>}
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre>
          <code>{trimmed}</code>
        </pre>
      )}
    </figure>
  )
}
