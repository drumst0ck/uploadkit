---
id: 260415-d8w
slug: blog-mdx-infrastructure
status: in-progress
---

# Quick Task: Blog MDX Infrastructure

## Goal
Create blog infrastructure in `apps/web` with MDX, categories, SEO (JSON-LD, dynamic OG images, sitemap, RSS). No posts yet beyond 1 hello-world example.

## Scope
- Routes: `/blog` (index) and `/blog/[slug]` (post page)
- Content source: local MDX files in `apps/web/content/blog/*.mdx`
- Categories: Tutorials, Comparisons, Engineering, Changelog
- SEO: JSON-LD Article schema, metadata API, dynamic OG image via `/blog/[slug]/opengraph-image.tsx`
- Sitemap: extend `sitemap.ts` to include blog posts
- RSS: `/blog/rss.xml` route handler
- Syntax highlighting: use already-installed `shiki`

## Stack Decisions
- **MDX via `next-mdx-remote/rsc`** — lightweight, no build step, works in RSC. Avoid content-collections (extra deps, codegen).
- **Frontmatter with `gray-matter`** — industry standard.
- **Shiki** already installed → use for code blocks via rehype plugin.
- **Visual alignment**: follow existing `.changelog-*` CSS pattern in `globals.css` — add `.blog-*` classes. Navbar + Footer reused.

## Files to Create
1. `apps/web/content/blog/hello-world.mdx` — example post
2. `apps/web/src/lib/blog.ts` — post loader (reads MDX files, parses frontmatter)
3. `apps/web/src/app/blog/page.tsx` — index with category filter
4. `apps/web/src/app/blog/[slug]/page.tsx` — post page with JSON-LD
5. `apps/web/src/app/blog/[slug]/opengraph-image.tsx` — dynamic OG image
6. `apps/web/src/app/blog/rss.xml/route.ts` — RSS feed
7. `apps/web/src/app/blog/blog.css` (or extend globals.css) — blog styles
8. Update `apps/web/src/app/sitemap.ts` to include posts
9. Update `apps/web/package.json` with: `gray-matter`, `next-mdx-remote`, `rehype-pretty-code`

## Post Frontmatter Schema
```yaml
---
title: string
description: string
category: "Tutorials" | "Comparisons" | "Engineering" | "Changelog"
publishedAt: YYYY-MM-DD
author: string
tags: string[]
---
```

## Success Criteria
- `pnpm --filter @uploadkitdev/web build` passes
- `/blog` shows hello-world post with category tag
- `/blog/hello-world` renders MDX with syntax-highlighted code block
- `/blog/hello-world/opengraph-image` returns a PNG
- `/blog/rss.xml` returns valid RSS 2.0
- `sitemap.xml` includes `/blog` and post URLs
- Visual style matches landing (uses Navbar/Footer, typography coherent)
