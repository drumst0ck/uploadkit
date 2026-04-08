# Phase 8: Landing & Pricing Pages - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Public marketing site at `uploadkit.dev` — hero with animated code snippet, interactive code demo with live component preview, features grid, competitor comparison, component showcase, pricing page with monthly/yearly toggle, footer. CSS animations via IntersectionObserver, responsive, dark mode, SEO with static OG images, Lighthouse 90+.

</domain>

<decisions>
## Implementation Decisions

### Visual Direction
- **D-01:** Dark + gradient aesthetic — dark background (#0a0a0b), subtle gradient mesh accents, indigo/blue glow effects. Vercel/Linear tech-forward style.
- **D-02:** Typography: Satoshi for headings (geometric, modern), Inter for body text. Strong tech identity.
- **D-03:** Hero: large headline + animated code snippet showing 3-line integration. "5GB free forever" badge. Two CTAs: "Get started free" + "View docs".

### Code Demo Section
- **D-04:** Shiki for syntax highlighting (build-time SSG). Zero client JS for code blocks. Best performance.
- **D-05:** Live rendered component preview — actually render UploadButton/UploadDropzone/UploadModal next to the code. Interactive, imports @uploadkit/react. Dark/light toggle for the preview.

### Pricing Page
- **D-06:** Monthly/yearly toggle as a switch with "Save 20%" badge next to "Yearly" label. Promotional style.
- **D-07:** 4 equal tier cards side by side: Free, Pro ($15/mo), Team ($35/mo), Enterprise ("Contact Sales"). Pro card highlighted as "Most Popular".

### Performance + SEO
- **D-08:** CSS transitions + IntersectionObserver for scroll-triggered animations. No JS animation library. Lighthouse 90+ target.
- **D-09:** Static pre-designed OG images in /public — one for homepage, one for pricing page. Simple and fast.

### Claude's Discretion
- Gradient mesh implementation details
- Feature grid icon design (inline SVG vs lucide)
- Competitor comparison table wording (subtle, "Others" not named)
- Component showcase interactive design
- Footer layout and link structure
- Noise texture implementation (CSS vs image)
- Specific Shiki theme selection
- Navigation header design (sticky, transparent, etc.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specification
- `UPLOADKIT-GSD.md` §5.1 — Landing page structure (routes)
- `UPLOADKIT-GSD.md` §5.2 — Homepage sections (hero, code demo, features, comparison, showcase, pricing, footer)
- `UPLOADKIT-GSD.md` §5.3 — Pricing tiers, overage pricing, feature comparison matrix

### Design Philosophy
- `~/.claude/CLAUDE.md` — Pixel Architect design agent (premium visual design, depth, glassmorphism, noise textures, gradient meshes, motion design, CSS custom properties)

### Existing Code
- `apps/web/src/app/layout.tsx` — Web app skeleton
- `apps/web/src/app/page.tsx` — Empty page stub
- `packages/react/` — @uploadkit/react components for live preview
- `packages/react/src/styles.css` — Component theming system

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@uploadkit/react` — UploadButton, UploadDropzone, UploadModal components for live showcase
- `packages/react/src/styles.css` — CSS variables theming for component preview
- `packages/config/tailwind/base.css` — Shared Tailwind v4 base
- `packages/shared/src/constants.ts` — TIER_LIMITS for pricing data

### Established Patterns
- Next.js 16 App Router with `output: 'standalone'` for Docker
- Tailwind v4 with CSS custom properties
- Dark mode via `[data-theme]` + `prefers-color-scheme`

### Integration Points
- Landing page at `uploadkit.dev` (separate from dashboard at `app.uploadkit.dev`)
- Pricing CTA buttons link to `app.uploadkit.dev/login` or `/dashboard/billing`
- Docs link goes to `docs.uploadkit.dev`
- Live component preview imports `@uploadkit/react` and its `styles.css`

</code_context>

<specifics>
## Specific Ideas

- Satoshi font available via Fontsource (`@fontsource/satoshi`) or Google Fonts CDN
- Shiki can be used with `rehype-shiki` for MDX or `shiki.getHighlighter()` for programmatic use — SSG at build time
- The live component preview should be a client component island (`"use client"`) within the otherwise static page
- Consider `next/font` for font loading (automatic optimization, no layout shift)
- The competitor comparison should be subtle — feature table with checkmarks, "Others" column, no direct naming
- IntersectionObserver animations: use CSS classes like `.animate-in` toggled on scroll entry, with `@media (prefers-reduced-motion: reduce)` disabling all

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-landing-pricing-pages*
*Context gathered: 2026-04-09*
