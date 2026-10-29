// Server component: emits one <script type="application/ld+json">.
// Content must be hardcoded / repo-derived (never user input). '<' is escaped anyway.
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
