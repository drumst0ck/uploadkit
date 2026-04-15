---
status: complete
---

# Quick Task: Blog MDX Infrastructure — Summary

Shipped the full `/blog` infrastructure in `apps/web`: MDX content pipeline, category filter, SEO (metadata + JSON-LD Article + dynamic OG image), RSS 2.0 feed, and sitemap entries. First real post (`hello-world`) included.

## Files created

- `apps/web/content/blog/hello-world.mdx` — intro post (Engineering, 2026-04-15) showcasing headings, lists, inline code, fenced TS code block (Shiki), blockquote, and links.
- `apps/web/src/lib/blog.ts` — `Post` type, `getAllPosts`, `getPostBySlug`, `getPostsByCategory`, `formatPostDate`. Reads `apps/web/content/blog/*.mdx`, parses frontmatter with `gray-matter`, memoized with `React.cache()`. `server-only`.
- `apps/web/src/app/blog/page.tsx` — RSC index. Category filter via `searchParams` (no client island). Responsive card grid.
- `apps/web/src/app/blog/[slug]/page.tsx` — RSC post page. `generateStaticParams` + `generateMetadata` (OG + Twitter + canonical). Renders MDX via `compileMDX` from `next-mdx-remote/rsc` + `rehype-pretty-code` (Shiki, theme `github-dark`). Inline JSON-LD `Article` script.
- `apps/web/src/app/blog/[slug]/opengraph-image.tsx` — `ImageResponse` 1200×630 (nodejs runtime). Category pill + title + UploadKit wordmark on indigo radial-gradient background.
- `apps/web/src/app/blog/rss.xml/route.ts` — RSS 2.0 feed, XML-escaped, `Content-Type: application/rss+xml`.

## Files modified

- `apps/web/src/app/globals.css` — appended `/* ============ BLOG ============ */` section with `.blog-hero`, `.blog-title`, `.blog-filter-pill`, `.blog-grid`, `.blog-card-*`, `.blog-post-*`, blockquote, `pre`/`code` and link styles. Mirrors the existing `.changelog-*` pattern, reuses CSS vars / fonts — dark mode automatic.
- `apps/web/src/app/sitemap.ts` — now async. Adds `/blog` (priority 0.8, weekly) and one entry per post (priority 0.7, monthly, `lastModified = publishedAt`).
- `apps/web/package.json` — added the three deps below.

## Packages added

All installed with `pnpm --filter @uploadkitdev/web add <pkg>@latest`:

- `next-mdx-remote` — `compileMDX` from `/rsc` entry, no extra build step.
- `gray-matter` — frontmatter parser.
- `rehype-pretty-code` — Shiki-powered syntax highlighting plugin for MDX.

`shiki` was already a dependency and is reused.

## Commits

1. `c0db5c0` feat(web): install blog dependencies (mdx, gray-matter, rehype-pretty-code)
2. `633dd85` feat(web): add blog post loader and hello-world MDX
3. `(pages)`  feat(web): add blog index and post pages with JSON-LD
4. `dae6dc7` feat(web): add dynamic OG image for blog posts
5. `1587bc9` feat(web): add blog RSS feed
6. `82f595c` feat(web): style blog with landing-aligned CSS
7. `905f754` feat(web): include blog posts in sitemap

## Validation

- `pnpm --filter @uploadkitdev/web typecheck` — pass
- `pnpm --filter @uploadkitdev/web lint` — pass
- `pnpm --filter @uploadkitdev/web build` — pass. Routes: `/blog`, `/blog/[slug]` (SSG for `hello-world`), `/blog/[slug]/opengraph-image`, `/blog/rss.xml`, `/sitemap.xml`.

## How to add a new post

Create `apps/web/content/blog/<slug>.mdx` with frontmatter `title`, `description`, `category` (`Tutorials | Comparisons | Engineering | Changelog`), `publishedAt` (`YYYY-MM-DD`), `author`, optional `tags: [...]`. Write the body in MDX — fenced code blocks (```ts, ```bash, etc.) are highlighted by Shiki via `rehype-pretty-code` and every block element is styled by `.blog-post-body` selectors in `globals.css`. The post is automatically picked up by the index (`/blog`), gets a statically-generated page (`/blog/<slug>`), a dynamic OG image, a sitemap entry (priority 0.7, `lastModified = publishedAt`), and an RSS item. No registration step — the filesystem is the source of truth.
