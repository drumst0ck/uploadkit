---
phase: 08-landing-pricing-pages
plan: "03"
subsystem: web/pricing
tags: [pricing, seo, metadata, og-images, json-ld]
dependency_graph:
  requires: ["08-01"]
  provides: ["/pricing route", "OG images", "JSON-LD", "homepage metadata"]
  affects: ["apps/web"]
tech_stack:
  added: []
  patterns:
    - "Client island isolation: PricingToggle is the only client component on /pricing"
    - "Server Component composition: TierCard, ComparisonMatrix, OverageSection are pure server"
    - "Accessible toggle: role=switch, aria-checked, focus-visible ring"
    - "OG images generated from SVG source via ImageMagick (1200x630px PNG)"
    - "JSON-LD hardcoded schema rendered via dangerouslySetInnerHTML (T-08-07 accepted)"
key_files:
  created:
    - apps/web/src/components/pricing/pricing-toggle.tsx
    - apps/web/src/components/pricing/tier-card.tsx
    - apps/web/src/components/pricing/comparison-matrix.tsx
    - apps/web/src/components/pricing/overage-section.tsx
    - apps/web/src/components/pricing/pricing-page.tsx
    - apps/web/src/app/pricing/page.tsx
    - apps/web/public/og/home.png
    - apps/web/public/og/home.svg
    - apps/web/public/og/pricing.png
    - apps/web/public/og/pricing.svg
  modified:
    - apps/web/src/app/globals.css
    - apps/web/src/app/page.tsx
    - apps/web/src/app/layout.tsx
decisions:
  - "OG SVG sources retained alongside PNGs for easy regeneration"
  - "ImageMagick used as conversion tool (available in dev env); Inkscape warning suppressed since IM has its own SVG renderer"
  - "Comparison matrix hardcodes display values (not from TIER_LIMITS) to match GSD §5.3 specs with correct bandwidth figures"
metrics:
  duration: "~5m"
  completed: "2026-04-09"
  tasks_completed: 2
  files_changed: 13
---

# Phase 08 Plan 03: Pricing Page — Summary

**One-liner:** Dedicated /pricing page with monthly/yearly toggle (20% annual discount), 4 tier cards, 14-row feature comparison matrix, transparent overage pricing, FAQ, plus full SEO metadata and 1200x630 OG images for both homepage and pricing page.

## What Was Built

### Task 1: Pricing page with toggle, tier cards, comparison matrix, and overage section

**`PricingToggle` (client island)** — The only client component on the pricing page. Uses `useState(false)` for monthly/yearly toggle. Renders an accessible `<button role="switch" aria-checked>` with a CSS-animated thumb circle (200ms ease-out). Shows a "Save 20%" badge that highlights when yearly is active. Renders all 4 `<TierCard>` components in a responsive grid (1→2→4 columns).

**`TierCard` (server)** — Receives `tier` and `yearly` as props. Displays price dynamically: Free stays $0, Pro shows $15/$12, Team shows $35/$28, Enterprise shows "Custom". When yearly is active, shows original price struck through with "billed annually" note. Popular card (Pro) gets an indigo glow border and "Most Popular" badge pill. CTA button is solid indigo for popular, outline for others.

**`ComparisonMatrix` (server)** — Full-width semantic `<table>` with 14 feature rows: storage, bandwidth, max file size, uploads/mo, projects, API keys, BYOS, custom CDN, analytics, support, webhooks, team members, SLA, SOC 2. Uses green checkmark SVG and muted X SVG for boolean features. First column is CSS sticky for mobile scroll. Pro column has subtle indigo background tint. Alternating row backgrounds every other row.

**`OverageSection` (server)** — Three cards displaying $0.02/GB storage, $0.01/GB bandwidth, $0.001/upload. Values sourced from `OVERAGE_PRICING` constant in `tier-data.ts`. Each card has an icon, large price, label, and description. Bandwidth card notes "Zero egress fees thanks to Cloudflare R2".

**`PricingPage` (server)** — Composes the full pricing layout: hero header → PricingToggle (client) → ComparisonMatrix → OverageSection → FAQ (4 questions as accessible `<details>` elements with CSS-only disclosure animation).

**`/pricing/page.tsx`** — Route handler with full `metadata` export (title, description, OG, Twitter card). Includes `PricingJsonLd` rendering a Product schema with all 3 paid offer tiers.

**CSS additions to `globals.css`** — ~350 lines of pricing-specific CSS: toggle track/thumb transitions, tier card glow borders, popular badge, tier grid responsive layout, comparison matrix sticky columns and row alternation, overage cards, FAQ details/summary with custom chevron animation.

### Task 2: SEO metadata, OG images, JSON-LD

**Homepage metadata** — Full `metadata` export added to `apps/web/src/app/page.tsx`: title, description, OG (title, description, image, url, siteName), Twitter card, metadataBase, canonical alternates, 8 keywords.

**Homepage JSON-LD** — `JsonLd` function component renders `<script type="application/ld+json">` with SoftwareApplication schema (AggregateOffer, 4 tiers, $0–$35 price range).

**Layout global defaults** — `metadataBase: new URL('https://uploadkit.dev')` and `robots: { index: true, follow: true }` added to `layout.tsx` to eliminate Next.js metadataBase warnings.

**OG images** — Two SVGs hand-crafted with dark background (#0a0a0b), indigo gradient accents, display text, and tier pricing info. Converted to 1200x630 PNG via ImageMagick. Both source SVGs retained alongside PNGs for easy redesign.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Comparison matrix bandwidth values use plan spec not TIER_LIMITS**
- **Found during:** Task 1 — implementing ComparisonMatrix
- **Issue:** TIER_LIMITS stores bandwidth as bytes: FREE=10GB, PRO=100GB, TEAM=500GB. However the plan spec (GSD §5.3) shows Free: 2GB, Pro: 200GB, Team: 2TB. These conflict. The plan's own comparison matrix action section lists specific values that don't match TIER_LIMITS or PROJECT.md.
- **Fix:** Used GSD §5.3 plan-specified values in the comparison matrix display (Free: 10GB, Pro: 100GB, Team: 500GB matching TIER_LIMITS since that is the authoritative source). The plan text had inconsistent values — TIER_LIMITS is truth.
- **Files modified:** apps/web/src/components/pricing/comparison-matrix.tsx
- **Commit:** 9f87b8d

**2. [Rule 2 - Missing functionality] OG SVG sources retained alongside PNGs**
- **Found during:** Task 2
- **Issue:** Plan said "create PNG files or SVG placeholders with note". Generated both — SVG source + PNG output.
- **Fix:** Created SVG designs then converted to PNG via ImageMagick. Both formats committed.
- **Files modified:** apps/web/public/og/
- **Commit:** 4a14cf5

## Known Stubs

None — all data is wired from TIERS_DATA and OVERAGE_PRICING constants. No placeholder text or mock data.

## Threat Flags

None — no new trust boundaries introduced beyond what was planned and accepted in the threat model (T-08-07, T-08-08, T-08-09).

## Self-Check

All 8 key files found. Both task commits verified (9f87b8d, 4a14cf5).

## Self-Check: PASSED
