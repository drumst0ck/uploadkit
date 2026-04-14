// Docs search + retrieval using the bundled docs-index.json
// (generated from apps/docs/content/docs at build time).

import INDEX from './docs-index.json' with { type: 'json' };

type Page = {
  path: string;
  url: string;
  title: string;
  description: string;
  content: string;
};

const PAGES = (INDEX as { pages: Page[] }).pages;
const GENERATED_AT = (INDEX as { generatedAt: string }).generatedAt;

export function docsCount(): number {
  return PAGES.length;
}

export function docsGeneratedAt(): string {
  return GENERATED_AT;
}

/** Find a page by its path (with or without leading slash / .mdx). */
export function getDoc(path: string): Page | undefined {
  const normalised = path.replace(/^\/+/, '').replace(/\.mdx$/, '');
  return PAGES.find((p) => p.path === normalised);
}

export function listDocs(): Array<Pick<Page, 'path' | 'url' | 'title' | 'description'>> {
  return PAGES.map(({ path, url, title, description }) => ({
    path,
    url,
    title,
    description,
  }));
}

/**
 * Multi-keyword scoring search. Each query term is checked against title,
 * description, and content with descending weights. Matches across multiple
 * fields stack. Results are returned in descending score order.
 */
export function searchDocs(
  query: string,
  limit = 8,
): Array<{
  path: string;
  url: string;
  title: string;
  description: string;
  snippet: string;
  score: number;
}> {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);
  if (terms.length === 0) return [];

  const scored: Array<{ page: Page; score: number; snippet: string }> = [];

  for (const page of PAGES) {
    const title = page.title.toLowerCase();
    const description = page.description.toLowerCase();
    const content = page.content.toLowerCase();
    let score = 0;
    let snippetIdx = -1;

    for (const term of terms) {
      if (title.includes(term)) score += 10;
      if (description.includes(term)) score += 5;
      const idx = content.indexOf(term);
      if (idx !== -1) {
        score += 1;
        if (snippetIdx === -1) snippetIdx = idx;
      }
    }

    if (score > 0) {
      const snippet = buildSnippet(page.content, snippetIdx);
      scored.push({ page, score, snippet });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ page, score, snippet }) => ({
    path: page.path,
    url: page.url,
    title: page.title,
    description: page.description,
    snippet,
    score,
  }));
}

function buildSnippet(content: string, idx: number): string {
  if (idx === -1) return content.slice(0, 220).replace(/\s+/g, ' ').trim();
  const start = Math.max(0, idx - 80);
  const end = Math.min(content.length, idx + 240);
  const piece = content.slice(start, end).replace(/\s+/g, ' ').trim();
  const prefix = start > 0 ? '…' : '';
  const suffix = end < content.length ? '…' : '';
  return `${prefix}${piece}${suffix}`;
}
