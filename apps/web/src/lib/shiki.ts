import { createHighlighter, type Highlighter } from 'shiki'

// Singleton pattern — one shared highlighter instance across all server renders
// Avoids loading themes/langs multiple times (Pitfall: re-instantiating is expensive)
let highlighterPromise: Promise<Highlighter> | null = null

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark'],
      langs: ['typescript', 'tsx', 'bash'],
    })
  }
  return highlighterPromise
}

/**
 * Highlight a code string using Shiki at build time (Server Component only).
 * Returns pre-rendered HTML — safe to use with dangerouslySetInnerHTML
 * when code is a hardcoded constant (not user input).
 */
export async function highlight(
  code: string,
  lang: string,
  theme = 'github-dark',
): Promise<string> {
  const highlighter = await getHighlighter()
  return highlighter.codeToHtml(code, { lang, theme })
}
