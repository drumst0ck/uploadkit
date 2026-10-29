// Pure helpers that build schema.org JSON-LD objects. Render them with <JsonLd /> from
// '@/components/landing/json-ld'. Only pass hardcoded / repo-derived content.

export const SITE_URL = 'https://uploadkit.dev'

export const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'UploadKit',
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  sameAs: ['https://github.com/drumst0ck/uploadkit'],
} as const

export interface FaqEntry {
  question: string
  /** Plain-text answer. Rendered verbatim on the page and in the FAQPage schema. */
  answer: string
  /** Optional visible link rendered after the answer (not part of the schema text). */
  link?: { label: string; href: string }
}

export function faqJsonLd(items: FaqEntry[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.question,
      acceptedAnswer: { '@type': 'Answer', text: i.answer },
    })),
  }
}

export interface Crumb {
  name: string
  /** Path ("/vs/uploadthing") or absolute URL. */
  path: string
}

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.path.startsWith('http') ? c.path : `${SITE_URL}${c.path}`,
    })),
  }
}

/** Wraps nodes in a single `@graph` document. */
export function graph(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes }
}
