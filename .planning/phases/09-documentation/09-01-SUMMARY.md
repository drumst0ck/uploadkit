---
phase: 09-documentation
plan: "01"
subsystem: docs
tags: [fumadocs, mdx, nextjs, tailwind, search]

requires: []
provides:
  - Fumadocs MDX pipeline bootstrapped in apps/docs
  - Sidebar navigation with 2-level hierarchy matching GSD 6.2 structure
  - Built-in Orama search endpoint at /api/search
  - Content skeleton with all section meta.json files
  - Introduction landing page at /docs with Card quick links
affects:
  - 09-02-PLAN
  - 09-03-PLAN
  - 09-04-PLAN

tech-stack:
  added:
    - fumadocs-mdx 14.2.11 (MDX collection pipeline)
    - fumadocs-core 16.7.11 (loader, search server)
    - fumadocs-ui 16.7.11 (DocsLayout, DocsPage, RootProvider)
    - "@types/mdx latest (MDXContent type declarations)"
  patterns:
    - "source.config.ts defineDocs -> .source/server.ts generated -> collections/server import"
    - "loader() from fumadocs-core/source wraps toFumadocsSource() for page tree"
    - "page.data cast to MdxPageData interface to access body/toc/structuredData"
    - "defaultMdxComponents + TabsComponents spread with MDXComponents cast for exactOptionalPropertyTypes"

key-files:
  created:
    - apps/docs/source.config.ts
    - apps/docs/src/lib/source.ts
    - apps/docs/src/lib/layout.shared.tsx
    - apps/docs/src/components/mdx.tsx
    - apps/docs/src/app/global.css
    - apps/docs/src/app/docs/layout.tsx
    - apps/docs/src/app/docs/[[...slug]]/page.tsx
    - apps/docs/src/app/api/search/route.ts
    - apps/docs/content/docs/index.mdx
    - apps/docs/content/docs/meta.json
    - apps/docs/content/docs/getting-started/meta.json
    - apps/docs/content/docs/core-concepts/meta.json
    - apps/docs/content/docs/sdk/meta.json
    - apps/docs/content/docs/sdk/core/meta.json
    - apps/docs/content/docs/sdk/react/meta.json
    - apps/docs/content/docs/sdk/next/meta.json
    - apps/docs/content/docs/api-reference/meta.json
    - apps/docs/content/docs/guides/meta.json
    - apps/docs/content/docs/dashboard/meta.json
  modified:
    - apps/docs/next.config.ts
    - apps/docs/package.json
    - apps/docs/tsconfig.json
    - apps/docs/src/app/layout.tsx
    - apps/docs/src/app/page.tsx

key-decisions:
  - "declaration: false in docs tsconfig.json — same pattern as dashboard; prevents non-portable type errors from source.config.ts zod v4 inference"
  - "MdxPageData local interface cast in page.tsx — fumadocs-core PageData base type lacks body/toc; cast is safe since fumadocs-mdx runtime always injects these fields"
  - "MDXComponents cast in getMDXComponents — exactOptionalPropertyTypes: true makes defaultMdxComponents img type incompatible; cast is sound since fumadocs-ui types are correct at runtime"
  - "@ts-ignore on source.config.ts docs export — zod v4 internal type reference is non-portable; ts-ignore is scoped to single line"

patterns-established:
  - "Fumadocs content pipeline: defineDocs in source.config.ts -> loader() in src/lib/source.ts -> DocsLayout + DocsPage in app routes"
  - "Sidebar hierarchy via meta.json files: root meta.json orders sections, each section has its own meta.json with page list"

requirements-completed:
  - DOCS-01

duration: 20min
completed: "2026-04-08"
---

# Phase 09 Plan 01: Fumadocs Bootstrap Summary

**Fumadocs docs site with MDX pipeline, Orama search, DocsLayout sidebar, and 8-section content skeleton — builds and serves /docs with 2-level navigation**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-08T23:10:03Z
- **Completed:** 2026-04-08T23:19:15Z
- **Tasks:** 2
- **Files modified:** 24

## Accomplishments

- Complete Fumadocs MDX pipeline: `source.config.ts` → `.source/` generation → `collections/server` import → `loader()` → page tree
- `DocsLayout` with sidebar showing all 8 sections (Getting Started, Core Concepts, SDK, API Reference, Dashboard, Guides) at `defaultOpenLevel: 1`
- Built-in Orama search endpoint at `/api/search` via `createFromSource`
- Content skeleton: 11 `meta.json` files defining exact page hierarchy per GSD 6.2, plus polished `/docs` introduction page

## Task Commits

1. **Task 1: Fumadocs MDX pipeline and app shell** - `57bccc7` (feat)
2. **Task 2: Content skeleton with sidebar hierarchy and index page** - `b93f6ec` (feat)

## Files Created/Modified

- `apps/docs/source.config.ts` - defineDocs MDX collection for content/docs
- `apps/docs/next.config.ts` - createMDX wrapper; removed standalone output
- `apps/docs/tsconfig.json` - added collections/* path alias, declaration: false
- `apps/docs/package.json` - added @types/mdx devDependency
- `apps/docs/src/lib/source.ts` - fumadocs-core loader wrapping toFumadocsSource()
- `apps/docs/src/lib/layout.shared.tsx` - baseOptions() with nav title and GitHub link
- `apps/docs/src/components/mdx.tsx` - defaultMdxComponents + TabsComponents registry
- `apps/docs/src/app/layout.tsx` - RootProvider from fumadocs-ui/provider/next
- `apps/docs/src/app/global.css` - tailwindcss + fumadocs-ui neutral + preset CSS
- `apps/docs/src/app/page.tsx` - redirect to /docs
- `apps/docs/src/app/docs/layout.tsx` - DocsLayout with sidebar defaultOpenLevel 1
- `apps/docs/src/app/docs/[[...slug]]/page.tsx` - DocsPage with generateStaticParams + generateMetadata
- `apps/docs/src/app/api/search/route.ts` - createFromSource Orama search endpoint
- `apps/docs/content/docs/index.mdx` - introduction page with Cards quick links
- `apps/docs/content/docs/meta.json` + 10 section meta.json files - sidebar hierarchy

## Decisions Made

- `declaration: false` in docs tsconfig — same pattern as dashboard (Phase 06); avoids non-portable type errors when `source.config.ts` exports `docs` whose inferred type references zod v4 internal paths
- `MdxPageData` local interface cast in `page.tsx` — `fumadocs-core` types `page.data` as `PageData` (base) which lacks `body`/`toc`; the cast is safe because fumadocs-mdx runtime always injects these fields
- `as MDXComponents` cast in `getMDXComponents` — `exactOptionalPropertyTypes: true` makes `defaultMdxComponents.img` type incompatible with `MDXComponents`; runtime behavior is correct
- `@ts-ignore` on `source.config.ts` docs export — zod v4 inferred type references non-portable internal path; suppressed at source

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `source.config.ts` zod v4 portability type error**
- **Found during:** Task 1 verification build
- **Issue:** `export const docs = defineDocs(...)` — TypeScript could not name the inferred type without referencing zod v4's internal `$loose` type path, causing build failure
- **Fix:** Added `// @ts-ignore` comment on the export line; added `declaration: false` in tsconfig to prevent declaration emit attempts
- **Files modified:** `apps/docs/source.config.ts`, `apps/docs/tsconfig.json`
- **Committed in:** `57bccc7` (Task 1)

**2. [Rule 1 - Bug] Fixed `page.data.body` type error in docs page**
- **Found during:** Task 1 verification build
- **Issue:** `fumadocs-core/source` types `page.data` as base `PageData` which has no `body`, `toc`, or `full` fields — TypeScript error on access
- **Fix:** Added local `MdxPageData` interface and cast `page.data as unknown as MdxPageData`; added `@types/mdx` for `MDXContent` type
- **Files modified:** `apps/docs/src/app/docs/[[...slug]]/page.tsx`, `apps/docs/package.json`
- **Committed in:** `57bccc7` (Task 1)

**3. [Rule 1 - Bug] Fixed `exactOptionalPropertyTypes` incompatibility in mdx.tsx**
- **Found during:** Task 1 verification build
- **Issue:** Spreading `defaultMdxComponents` into `MDXComponents` return type failed — `img` type mismatch under `exactOptionalPropertyTypes: true`
- **Fix:** Cast `defaultMdxComponents` and `TabsComponents` to `MDXComponents` before spreading
- **Files modified:** `apps/docs/src/components/mdx.tsx`
- **Committed in:** `57bccc7` (Task 1)

---

**Total deviations:** 3 auto-fixed (3 Rule 1 - type/build bugs)
**Impact on plan:** All fixes were TypeScript strictness-related; no behavior changes. The zod v4 + fumadocs-mdx type portability issue is a known upstream compatibility problem.

## Issues Encountered

- fumadocs-mdx 14.x + zod 4.x type portability: `defineDocs()` inferred return type references zod internal path that TypeScript cannot serialize into a declaration. Resolved with `declaration: false` + `@ts-ignore` (same pattern used for Auth.js internals in dashboard).

## User Setup Required

None — no external service configuration required. The docs site runs locally with `pnpm --filter @uploadkit/docs dev`.

## Next Phase Readiness

- Fumadocs infrastructure is complete. Plans 09-02 through 09-04 only need to write MDX content files in the established `content/docs/` directories.
- All 8 sections are defined in meta.json files; subsequent plans fill in the actual page content.
- Search is wired and will index any MDX pages added.

---
*Phase: 09-documentation*
*Completed: 2026-04-08*

## Self-Check: PASSED

- FOUND: apps/docs/source.config.ts
- FOUND: apps/docs/src/lib/source.ts
- FOUND: apps/docs/src/app/api/search/route.ts
- FOUND: apps/docs/content/docs/index.mdx
- FOUND: apps/docs/content/docs/meta.json
- FOUND: apps/docs/content/docs/sdk/core/meta.json
- FOUND commit 57bccc7: feat(09-01): Fumadocs MDX pipeline and app shell
- FOUND commit b93f6ec: feat(09-01): content skeleton with sidebar hierarchy and index page
