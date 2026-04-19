---
quick_id: 260418-ns8
slug: redesign-landing-page-per-claude-design-
description: Redesign landing page per Claude Design bundle (keep violet accent, keep real showcase)
status: complete
date: 2026-04-18
commits: 5
---

# Quick Task 260418-ns8 — Summary

## Outcome

Redesigned `apps/web` landing page matching the Claude Design bundle (shape, spacing, typography, section flow) while preserving the project's existing violet accent system (`#6366f1` / `#818cf8`) and keeping `LandingShowcase` (real `@uploadkitdev/react` previews) intact.

## Commits

| # | SHA | Scope |
|---|-----|-------|
| 1 | `8df7027` | Design tokens, Geist/Geist Mono via next/font, theme/accent scaffolding in `layout.tsx` + `globals.css` |
| 2 | `8f4a58b` | `DesignIcon`, `TweaksPanel`, `usePreferences` hook, `LogosStrip`, Navbar restyle |
| 3 | `a91e6cd` | `HeroDropzoneDemo` — live drag/drop, simulated progress, success states |
| 4 | `68d957f` | `DesignFeatures`, `FeatureMosaic`, `ByosSection` |
| 5 | `c79beb1` | Footer 5-col redesign + `page.tsx` recompose (Nav → Hero → Logos → Features → Showcase → Mosaic → BYOS → MCP → Pricing → Footer + Tweaks) |

## Files Touched

**New (11):**
- `apps/web/src/components/byos/byos-section.tsx`
- `apps/web/src/components/features/design-features.tsx`
- `apps/web/src/components/features/feature-mosaic.tsx`
- `apps/web/src/components/hero/hero-dropzone-demo.tsx`
- `apps/web/src/components/logos/logos-strip.tsx`
- `apps/web/src/components/tweaks/tweaks-panel.tsx`
- `apps/web/src/components/tweaks/use-preferences.ts`
- `apps/web/src/components/ui/design-icon.tsx`

**Edited (6):**
- `apps/web/src/app/globals.css` (+1,258 lines — design-v2 surface tokens & utilities, scoped under `[data-surface="design-v2"]`)
- `apps/web/src/app/layout.tsx` (pre-hydration theme script, font wiring)
- `apps/web/src/app/page.tsx` (recomposed — new section order & components)
- `apps/web/src/components/footer/footer.tsx` (5-col grid)
- `apps/web/src/components/nav/navbar.tsx` (restyled brand/mark/links)
- `apps/web/src/lib/fonts.ts` (Geist + Geist Mono)

**Total:** 2,726 insertions / 479 deletions across 14 files.

## Scope Anchors Honored

- ✅ Violet accent preserved; no yellow tokens introduced.
- ✅ `LandingShowcase` (real `@uploadkitdev/react` components) kept intact.
- ✅ `HeroCodeWindow` replaced with live `HeroDropzoneDemo`.
- ✅ `TweaksPanel` ships as a real user feature (theme + accent cycler, `localStorage` keys `uk-theme` / `uk-accent`, pre-hydration script prevents FOUC).
- ✅ Added Logos strip, FeatureMosaic, BYOS sections.
- ✅ Footer redesigned to 5-col grid.
- ✅ Preserved: `FeaturesSection`, `McpSection`, `PricingSection`.

## Verification

- `pnpm -F web typecheck` → clean (no TypeScript errors).
- CSS scope guard: new design classes live under `[data-surface="design-v2"]` selector to avoid collision with `/pricing`, `/changelog`, `/blog` page styles.

## Notes

- UI feature correctness not smoke-tested in a browser (per CLAUDE.md convention — user can run `pnpm -F web dev` to verify).
- Tweaks panel and theme toggle sync through the shared `usePreferences` hook with a `storage` event listener.
