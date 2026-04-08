---
phase: 08-landing-pricing-pages
plan: "01"
subsystem: web
tags: [landing, fonts, design-tokens, shiki, hero, navbar, server-components]
dependency_graph:
  requires: []
  provides:
    - apps/web foundation (dark theme, font system, CSS custom properties)
    - Shiki singleton highlight() for downstream plans
    - TIERS_DATA + formatBytes/formatNumber for pricing plan
    - Navbar and Hero components
  affects:
    - "08-02: code demo section (imports shiki.ts, globals.css animations)"
    - "08-03: pricing page (imports tier-data.ts, navbar)"
tech_stack:
  added:
    - shiki (build-time syntax highlighting, singleton pattern)
    - "@uploadkit/shared (workspace dep in apps/web)"
    - Satoshi woff2 fonts (localFont via next/font/local)
    - Inter (next/font/google with variable font)
  patterns:
    - Shiki singleton: module-level Promise, one highlighter shared across all server renders
    - CSS custom properties for all themeable values (design tokens)
    - gradient-mesh via ::before pseudo-element with stacked radial-gradient
    - line-reveal animation via .code-line spans + animation-delay nth-child
    - CSS :target for zero-JS mobile nav
    - async Server Component for Shiki (HeroCode)
key_files:
  created:
    - apps/web/src/lib/fonts.ts
    - apps/web/src/lib/shiki.ts
    - apps/web/src/lib/tier-data.ts
    - apps/web/src/fonts/Satoshi-Regular.woff2
    - apps/web/src/fonts/Satoshi-Medium.woff2
    - apps/web/src/fonts/Satoshi-Bold.woff2
    - apps/web/src/fonts/Satoshi-Black.woff2
    - apps/web/src/components/nav/navbar.tsx
    - apps/web/src/components/hero/hero.tsx
    - apps/web/src/components/hero/hero-code.tsx
  modified:
    - apps/web/package.json
    - apps/web/next.config.ts
    - apps/web/src/app/layout.tsx
    - apps/web/src/app/globals.css
    - apps/web/src/app/page.tsx
    - pnpm-lock.yaml
decisions:
  - "Satoshi fonts downloaded as woff2 from Fontshare zip bundle (not Fontsource) — extracted Regular/Medium/Bold/Black"
  - "Added @uploadkit/shared as workspace dep in apps/web (missing from original package.json)"
  - "wrapLines() helper in hero-code.tsx wraps Shiki output lines in .code-line spans for CSS stagger animation"
  - "CSS :target trick for mobile nav — zero client JS, links to #mobile-menu id"
  - "Removed erroneous onMouseEnter/onMouseEnterCapture=undefined props that violated exactOptionalPropertyTypes"
metrics:
  duration: "~4 minutes"
  completed_date: "2026-04-07"
  tasks_completed: 2
  files_changed: 15
---

# Phase 8 Plan 1: Web App Foundation & Hero Section Summary

**One-liner:** Dark-themed landing foundation with Satoshi/Inter fonts, Shiki singleton SSG highlighting, tier-data utilities, sticky navbar, and hero section with CSS line-reveal animated code snippet — all zero client JS.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Web app foundation — fonts, dark theme, next.config, shared utilities | `367a920` | fonts.ts, shiki.ts, tier-data.ts, globals.css, layout.tsx, next.config.ts |
| 2 | Navbar and hero section with animated code snippet | `5073cd7` | navbar.tsx, hero.tsx, hero-code.tsx, page.tsx |

## What Was Built

### Foundation (Task 1)
- **Font system:** Satoshi (900/700/500/400) via `next/font/local` woff2 files, Inter via `next/font/google`. Both expose CSS variables (`--font-satoshi`, `--font-inter`) — zero layout shift.
- **Dark design tokens:** `globals.css` defines `--color-surface: #0a0a0b`, accent indigo `#6366f1`, elevated surface, border, text-primary/secondary, accent-glow. All downstream components reference these vars.
- **Gradient mesh:** `.gradient-mesh::before` uses 3 stacked `radial-gradient` (indigo/blue/violet at 6–12% opacity) for the hero depth effect.
- **Scroll animations:** `.animate-section` / `.in-view` + `.stagger-grid` with CSS `--index` custom property. `prefers-reduced-motion` disables all transitions.
- **Shiki singleton:** `createHighlighter` wrapped in module-level Promise. `highlight(code, lang)` awaits once, reused across the build.
- **Tier data:** `TIERS_DATA` array (Free/Pro/Team/Enterprise) with prices from `TIER_LIMITS` constants. `formatBytes()` and `formatNumber()` handle Infinity → "Unlimited".
- **next.config.ts:** Added `@uploadkit/react`, `@uploadkit/core`, `@uploadkit/shared` to `transpilePackages`.

### Components (Task 2)
- **Navbar:** Server Component. Sticky `position: sticky; top: 0` with `backdrop-filter: blur(12px)` via `.navbar-backdrop` class. Logo with indigo glow dot, 4 nav links (Features/Pricing/Docs/GitHub), Sign in + Get started CTAs. Mobile: CSS `:target` panel (zero JS).
- **Hero:** Server Component. Gradient mesh section, "5GB free forever" pill badge with `badge-glow` animation, `h1` in Satoshi Black at `text-7xl`, subheadline in `text-secondary`, two CTAs (solid indigo + ghost outline), `<HeroCode />` below.
- **HeroCode:** Async Server Component. Awaits `highlight(CODE, 'tsx')`, then `wrapLines()` wraps each line in `<span class="code-line">` for nth-child stagger animation (300ms → 1550ms delays). Mock window chrome (3 dots). `dangerouslySetInnerHTML` safe — code is hardcoded constant.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added @uploadkit/shared as workspace dependency**
- **Found during:** Task 1 build
- **Issue:** `tier-data.ts` imports from `@uploadkit/shared` but it wasn't in `apps/web/package.json` dependencies
- **Fix:** `pnpm add @uploadkit/shared --filter @uploadkit/web --workspace`
- **Files modified:** `apps/web/package.json`, `pnpm-lock.yaml`

**2. [Rule 1 - Bug] Fixed `match[1]` possibly undefined in wrapLines()**
- **Found during:** Task 2 build TypeScript check
- **Issue:** `exactOptionalPropertyTypes` strict mode — regex `match[1]` is `string | undefined`
- **Fix:** Added `?? ''` fallback: `const codeContent = match[1] ?? ''`
- **Files modified:** `apps/web/src/components/hero/hero-code.tsx`

**3. [Rule 1 - Bug] Removed erroneous `onMouseEnter={undefined}` / `onMouseEnterCapture={undefined}` props**
- **Found during:** Task 2 build TypeScript check
- **Issue:** Placeholder props left in hero.tsx and navbar.tsx violated `exactOptionalPropertyTypes` — `undefined` not assignable to `MouseEventHandler`
- **Fix:** Removed both props entirely
- **Files modified:** `apps/web/src/components/hero/hero.tsx`, `apps/web/src/components/nav/navbar.tsx`

## Known Stubs

None — all components render real content. No placeholder data flows to UI.

## Threat Flags

None — no new network endpoints or trust boundaries beyond what the plan's threat model covers (T-08-01 through T-08-03 all accepted/mitigated as specified).

## Self-Check: PASSED
