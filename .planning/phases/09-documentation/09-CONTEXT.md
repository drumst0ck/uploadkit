# Phase 9: Documentation - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Fumadocs site at `docs.uploadkit.dev` with MDX content, built-in search, 2-level sidebar navigation. Content covers: quickstart (5-min setup), getting-started guides per framework, core concepts, SDK reference (@uploadkit/core, @uploadkit/react, @uploadkit/next), REST API reference, guides (image/avatar/document upload, multipart, custom styling, migration from UploadThing), and dashboard documentation.

</domain>

<decisions>
## Implementation Decisions

### Doc Structure
- **D-01:** 2-level sidebar hierarchy — sections (Getting Started, Core Concepts, SDK, API Reference, Dashboard, Guides) with pages directly underneath. No 3-level nesting.
- **D-02:** Framework-specific tabs on every code example where applicable (Next.js / React / API tabs). Fumadocs Tab component for tabbed code blocks.
- **D-03:** Hand-written MDX for all pages including API reference. Each REST endpoint gets its own MDX page with description, parameters, response schema, and curl example.

### Claude's Discretion (all of these — user said "you decide all")
- Fumadocs configuration and theme customization
- MDX component library (callouts, code blocks, tabs, cards)
- Search configuration (Fumadocs built-in search vs Algolia)
- Content writing tone and depth
- Page ordering within sections
- API reference layout and parameter table format
- Guide content scope and depth
- Dashboard docs content scope
- Migration from UploadThing guide structure
- Docs landing page design

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specification
- `UPLOADKIT-GSD.md` §6.1 — Fumadocs framework selection
- `UPLOADKIT-GSD.md` §6.2 — Complete content structure (all page paths)
- `UPLOADKIT-GSD.md` §6.3 — Quickstart content outline

### Existing Code
- `apps/docs/` — Next.js 16 skeleton (layout + page stub from Phase 1)
- `apps/docs/package.json` — Base package config
- `packages/core/src/` — SDK source for API reference
- `packages/react/src/` — Component source for prop documentation
- `packages/next/src/` — Handler/router source for config documentation
- `apps/api/src/app/api/v1/` — All REST endpoints for API reference
- `apps/api/src/lib/schemas.ts` — Zod schemas defining API contracts

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/docs/` — Next.js 16 scaffold ready for Fumadocs
- All SDK packages have TypeScript source with JSDoc comments
- `apps/api/src/lib/schemas.ts` — Zod schemas can inform API reference parameter tables
- `packages/shared/src/constants.ts` — TIER_LIMITS for pricing/limits documentation

### Integration Points
- Docs site at `docs.uploadkit.dev` (Phase 1 D-12 subdomain)
- Links from landing page hero CTA ("View docs") point here
- Links from dashboard help/support point here
- SDK npm README links point here

</code_context>

<specifics>
## Specific Ideas

- Fumadocs has built-in search (no Algolia needed for v1)
- The quickstart should demonstrate the fastest path: install → file router → provider → component → done in under 5 minutes
- The "Migration from UploadThing" guide is a key competitive differentiator — should map UploadThing API to UploadKit equivalents
- Code examples should be copy-pasteable and tested (not pseudocode)
- Consider using Fumadocs' OpenAPI integration for the REST API reference if available

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-documentation*
*Context gathered: 2026-04-09*
