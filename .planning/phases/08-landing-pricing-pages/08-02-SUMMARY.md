---
phase: 08-landing-pricing-pages
plan: "02"
subsystem: web
tags: [landing, code-demo, features, comparison, showcase, pricing, footer, scroll-animations, shiki, react-components]
dependency_graph:
  requires:
    - "08-01: shiki.ts highlight(), tier-data.ts TIERS_DATA, globals.css tokens"
    - "@uploadkit/react: UploadButton, UploadDropzone, UploadModal, UploadKitProvider"
  provides:
    - Full homepage with all 7 sections (hero + 6 new)
    - CodeDemo async Server Component with Shiki SSG highlighting
    - CodeDemoClient tab-switching + live component preview island
    - FeaturesGrid 6-card responsive grid
    - ComparisonTable semantic table with check/x icons
    - ComponentShowcase live @uploadkit/react demos
    - PricingPreview 3 tier cards from TIERS_DATA
    - Footer 4-column nav
    - AnimateObserver scroll entrance activator
    - useIntersection hook for per-element scroll animations
  affects:
    - "08-03: pricing page shares globals.css tokens and tier-data.ts"
tech_stack:
  added:
    - "@uploadkit/react (workspace dep added to apps/web)"
  patterns:
    - Async Server Component + Client island split (CodeDemo server / CodeDemoClient client)
    - Document-level IntersectionObserver via AnimateObserver (single client component, zero per-section JS)
    - "[data-animate] + in-view CSS class scroll entrance pattern"
    - "CSS stagger via --index custom property on grid children"
    - "TIERS_DATA.filter(t => t.slug !== 'enterprise') for landing preview subset"
    - "route prop (not endpoint) for @uploadkit/react components"
key_files:
  created:
    - apps/web/src/components/code-demo/code-demo.tsx
    - apps/web/src/components/code-demo/code-demo-client.tsx
    - apps/web/src/components/features/features-grid.tsx
    - apps/web/src/components/comparison/comparison-table.tsx
    - apps/web/src/components/showcase/component-showcase.tsx
    - apps/web/src/components/pricing-preview/pricing-preview.tsx
    - apps/web/src/components/footer/footer.tsx
    - apps/web/src/components/shared/animate-observer.tsx
    - apps/web/src/hooks/use-intersection.ts
  modified:
    - apps/web/src/app/page.tsx
    - apps/web/src/app/globals.css
    - apps/web/package.json
    - pnpm-lock.yaml
decisions:
  - "@uploadkit/react added as workspace dep in apps/web — missing from original package.json (Rule 3)"
  - "Component prop is route not endpoint — matched actual @uploadkit/react API (Rule 1)"
  - "entries[0] optional chaining in useIntersection — entries array destructure is possibly undefined under strictNullChecks (Rule 1)"
  - "AnimateObserver pattern: single document-level observer keeps all content sections as zero-JS Server Components"
  - "TIERS_DATA filtered to exclude Enterprise on landing preview — Enterprise appears on /pricing page only"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_changed: 13
---

# Phase 8 Plan 2: Landing Page Sections Summary

**One-liner:** Full homepage with Shiki SSG code demo (3 tabs + live component preview), 6-card features grid, semantic comparison table, live @uploadkit/react showcase, tier pricing preview from TIERS_DATA, and footer — all scroll-animated via a single document-level IntersectionObserver island.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Code demo, features grid, comparison table, component showcase | `816f03a` | code-demo.tsx, code-demo-client.tsx, features-grid.tsx, comparison-table.tsx, component-showcase.tsx, globals.css |
| 2 | Pricing preview, footer, scroll animations, page composition | `b8de3ad` | pricing-preview.tsx, footer.tsx, animate-observer.tsx, use-intersection.ts, page.tsx, globals.css |

## What Was Built

### Task 1

- **CodeDemo (Server Component):** Awaits `highlight()` for all 3 code tabs (Next.js/TypeScript, React/TSX, API/Bash) in parallel at build time. Passes pre-rendered Shiki HTML strings to `<CodeDemoClient>` as props.
- **CodeDemoClient (Client island):** Tab state (`nextjs` | `react` | `api`), dark/light preview theme toggle, `dangerouslySetInnerHTML` for Shiki output, `<UploadKitProvider apiKey="demo">` wrapping live `UploadButton` / `UploadDropzone` renders. API tab shows a styled JSON mock response.
- **FeaturesGrid (Server Component):** 6 cards in CSS Grid (1→2→3 cols), each with inline SVG icon in indigo accent bg, Satoshi title, Inter description. `style={{ '--index': i }}` for stagger delay. `data-animate` for scroll entrance.
- **ComparisonTable (Server Component):** Semantic `<table>` with 10 feature rows. `<CheckIcon>` (green, #4ade80) and `<XIcon>` (muted gray) as inline SVG. Horizontal scroll wrapper for mobile. Sticky header via `position: sticky; top: 0`.
- **ComponentShowcase (Client island):** Dark/light theme toggle at section level. Three demo panels (UploadButton, UploadDropzone, UploadModal) each wrapped in `<UploadKitProvider apiKey="demo">`. Modal panel has an "Open modal" trigger button.
- **globals.css additions:** Shared section layout tokens (`.container`, `.section-label`, `.section-title`, `.section-subtitle`), code demo tab bar, Shiki pane overrides, feature card hover, comparison table row styling, showcase card/theme styles.

### Task 2

- **useIntersection hook:** Generic per-element scroll entrance via `IntersectionObserver`. Uses `entries[0]?.isIntersecting` optional chain for strict TypeScript.
- **AnimateObserver (Client island):** Queries all `[data-animate]` elements once on mount, observes each, adds `in-view` class on intersection, then unobserves. Returns null (renders nothing). `prefers-reduced-motion` is handled in CSS — transitions are `none` so elements are instantly visible.
- **PricingPreview (Server Component):** Filters `TIERS_DATA` to Free/Pro/Team (excludes Enterprise). Shows tier name, price, 4 limits (storage/uploads/max-file-size/bandwidth) formatted via `formatBytes` / `formatNumber`. Pro card has `Most Popular` badge + indigo glow border. "See all plans →" text link to `/pricing`.
- **Footer (Server Component):** Semantic `<footer>` with 4-column grid (1→2→4 cols). Brand column with logo dot + tagline + copyright. Three nav columns (Product, Developers, Company). All external links use `target="_blank" rel="noopener noreferrer"` (T-08-04 mitigated).
- **page.tsx:** Full composition — Navbar, Hero, CodeDemo, FeaturesGrid, ComparisonTable, ComponentShowcase, PricingPreview, Footer, AnimateObserver. Page remains Server Component.
- **globals.css additions:** `[data-animate]` / `.in-view` scroll animation rules, pricing card grid + glow border + CTA buttons, footer responsive grid + link hover, smooth scroll `html { scroll-behavior: smooth }`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added @uploadkit/react as workspace dependency**
- **Found during:** Task 1 build
- **Issue:** `code-demo-client.tsx` and `component-showcase.tsx` import `@uploadkit/react` but it wasn't in `apps/web/package.json`
- **Fix:** `pnpm add @uploadkit/react --filter @uploadkit/web --workspace`
- **Files modified:** `apps/web/package.json`, `pnpm-lock.yaml`
- **Commit:** `816f03a`

**2. [Rule 1 - Bug] Fixed component prop: endpoint → route**
- **Found during:** Task 1 TypeScript check
- **Issue:** Plan specified `endpoint="imageUploader"` but actual `UploadButton`, `UploadDropzone`, `UploadModal` props use `route: string` — `endpoint` does not exist on the types
- **Fix:** Changed all occurrences to `route="imageUploader"` in `code-demo-client.tsx` and `component-showcase.tsx`
- **Files modified:** both client components
- **Commit:** `816f03a`

**3. [Rule 1 - Bug] Fixed useIntersection entries[0] possibly undefined**
- **Found during:** Task 2 TypeScript check
- **Issue:** Destructuring `([entry])` from IntersectionObserver callback yields `entry: IntersectionObserverEntry | undefined` under strict TypeScript
- **Fix:** Changed to `entries[0]?.isIntersecting` optional chain per plan's own code snippet (plan had `([entry])` — applied safe version)
- **Files modified:** `apps/web/src/hooks/use-intersection.ts`
- **Commit:** `b8de3ad`

## Known Stubs

None — all sections render real content sourced from constants or live components. No placeholder data flows to UI.

## Threat Flags

None — no new network endpoints beyond the plan's threat model. T-08-04 (external links) is mitigated: all external `<a>` tags in footer use `rel="noopener noreferrer"`. T-08-05 (demo apiKey) accepted: `apiKey="demo"` is a non-functional string, UploadKitProvider with invalid key renders UI without functional uploads.

## Self-Check: PASSED
