---
phase: quick-260409-krl
plan: 01
subsystem: docs
tags: [design, fumadocs, fonts, dark-mode, branding]
dependency_graph:
  requires: []
  provides: [docs-dark-theme, docs-satoshi-fonts, docs-favicon]
  affects: [apps/docs]
tech_stack:
  added: []
  patterns: [fumadocs CSS variable override, next/font/local, dark class forced on html]
key_files:
  created:
    - apps/docs/src/lib/fonts.ts
    - apps/docs/src/fonts/Satoshi-Regular.woff2
    - apps/docs/src/fonts/Satoshi-Medium.woff2
    - apps/docs/src/fonts/Satoshi-Bold.woff2
    - apps/docs/src/fonts/Satoshi-Black.woff2
    - apps/docs/public/favicon.svg
  modified:
    - apps/docs/src/app/layout.tsx
    - apps/docs/src/app/global.css
    - apps/docs/src/lib/layout.shared.tsx
decisions:
  - "Force dark mode via className=dark on html — fumadocs reads .dark class for token overrides"
  - "CSS variable overrides placed after @import lines in global.css — last declaration wins in cascade"
  - "Inline SVG logo in layout.shared.tsx uses unique gradient id uk-nav-grad to avoid conflicts"
metrics:
  duration: 8m
  completed: "2026-04-09T13:02:07Z"
  tasks_completed: 2
  files_changed: 9
---

# Phase quick-260409-krl Plan 01: Restyle Docs Site Summary

**One-liner:** Dark premium docs theme with UploadKit indigo palette, Satoshi headings, and brand favicon — overriding fumadocs-ui@16.7.10 CSS tokens via cascade.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Fonts, layout.tsx, and global.css overhaul | c8ff7f6 | fonts.ts, layout.tsx, global.css, 4x Satoshi woff2 |
| 2 | Logo, favicon, and build verification | 6ab8acc | layout.shared.tsx, favicon.svg |

## What Was Built

- **Dark forced docs site:** `className="dark"` on `<html>` ensures fumadocs always renders in dark mode. `suppressHydrationWarning` prevents SSR mismatch.
- **UploadKit palette via CSS cascade:** `.dark {}` block in `global.css` (after the three `@import` lines) overrides all `--color-fd-*` tokens. Key changes: near-black background (`#0a0a0b`), indigo primary (`#6366f1`), elevated card/popover (`#141416`), subtle border (`rgba(255,255,255,0.06)`).
- **Satoshi headings + Inter body:** `next/font/local` loads 4 Satoshi weights into `--font-satoshi`. Inter via Google Fonts into `--font-inter`. Both variables applied to `<html>` class list. CSS rules target `h1-h6` with Satoshi and `body` with Inter.
- **Code block polish:** `pre` overridden to GitHub dark background (`#0d1117`), inline `code` gets indigo tint (`rgba(99,102,241,0.12)`) with `#a5b4fc` text.
- **Brand favicon:** `apps/web/public/favicon.svg` (indigo-to-purple gradient rect + upload arrow) copied to `apps/docs/public/`. Referenced in layout metadata `icons: { icon: '/favicon.svg' }`.
- **UploadKit logo in nav:** `layout.shared.tsx` renders inline SVG mark (20x20, same paths as favicon) + "UploadKit" wordmark. Nav links updated to include `uploadkit.dev`. GitHub URL points to correct org/repo.

## Verification

- Build: `pnpm turbo build --filter=@uploadkit/docs` — 1 successful, 0 errors, 55 static pages generated in 11s
- TypeScript: passed in 1427ms with no errors
- All 55 docs pages statically generated

## Deviations from Plan

None — plan executed exactly as written. All variable names confirmed from `fumadocs-ui@16.7.10/css/lib/default-colors.css` before writing overrides.

## Known Stubs

None.

## Self-Check: PASSED

- apps/docs/src/fonts/Satoshi-Regular.woff2: FOUND
- apps/docs/src/lib/fonts.ts: FOUND
- apps/docs/src/app/layout.tsx: FOUND
- apps/docs/src/app/global.css: FOUND
- apps/docs/public/favicon.svg: FOUND
- apps/docs/src/lib/layout.shared.tsx: FOUND
- Commit c8ff7f6: FOUND
- Commit 6ab8acc: FOUND
