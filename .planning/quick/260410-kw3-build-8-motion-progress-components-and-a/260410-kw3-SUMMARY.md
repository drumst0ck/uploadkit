---
phase: quick-260410-kw3
plan: 01
subsystem: react-sdk, docs, web-showcase
tags: react-sdk, motion, progress, fumadocs, mdx-live-preview
requires:
  - packages/react context, hooks, motion-optional utility
  - apps/docs fumadocs MDX pipeline with getMDXComponents
  - apps/web /test/components showcase scaffold
provides:
  - "@uploadkitdev/react: 8 new motion/progress components (named exports + Props types)"
  - "apps/docs: live <ComponentPreview> wrapper globally registered in MDX"
  - "apps/docs: 16 MDX pages now render the real component above each code sample"
  - "apps/web: new 'Motion & Progress' showcase section with 8 Cards"
affects:
  - packages/react/src/styles.css (+CSS block, +8 class roots in reduced-motion selector list)
  - packages/react/src/index.ts (+16 named exports/types)
  - apps/docs/package.json (+@uploadkitdev/react workspace dep)
  - apps/docs/src/app/docs/layout.tsx (+styles.css import)
key-files:
  created:
    - packages/react/src/components/upload-progress-radial.tsx
    - packages/react/src/components/upload-progress-bar.tsx
    - packages/react/src/components/upload-progress-stacked.tsx
    - packages/react/src/components/upload-progress-orbit.tsx
    - packages/react/src/components/upload-cloud-rain.tsx
    - packages/react/src/components/upload-bento.tsx
    - packages/react/src/components/upload-particles.tsx
    - packages/react/src/components/upload-step-wizard.tsx
    - apps/docs/src/components/component-preview.tsx
    - apps/docs/src/components/preview-components.tsx
    - apps/docs/content/docs/sdk/react/upload-progress-radial.mdx
    - apps/docs/content/docs/sdk/react/upload-progress-bar.mdx
    - apps/docs/content/docs/sdk/react/upload-progress-stacked.mdx
    - apps/docs/content/docs/sdk/react/upload-progress-orbit.mdx
    - apps/docs/content/docs/sdk/react/upload-cloud-rain.mdx
    - apps/docs/content/docs/sdk/react/upload-bento.mdx
    - apps/docs/content/docs/sdk/react/upload-particles.mdx
    - apps/docs/content/docs/sdk/react/upload-step-wizard.mdx
  modified:
    - packages/react/src/styles.css
    - packages/react/src/index.ts
    - apps/docs/package.json
    - apps/docs/src/app/docs/layout.tsx
    - apps/docs/src/components/mdx.tsx
    - apps/docs/content/docs/sdk/react/upload-dropzone-glass.mdx
    - apps/docs/content/docs/sdk/react/upload-dropzone-aurora.mdx
    - apps/docs/content/docs/sdk/react/upload-dropzone-terminal.mdx
    - apps/docs/content/docs/sdk/react/upload-dropzone-brutal.mdx
    - apps/docs/content/docs/sdk/react/upload-button-shimmer.mdx
    - apps/docs/content/docs/sdk/react/upload-button-magnetic.mdx
    - apps/docs/content/docs/sdk/react/upload-avatar.mdx
    - apps/docs/content/docs/sdk/react/upload-inline-chat.mdx
    - apps/docs/content/docs/sdk/react/meta.json
    - apps/docs/content/docs/sdk/react/api-reference.mdx
    - apps/web/src/app/test/components/component-showcase.tsx
decisions:
  - "preview-components.tsx client-boundary re-export: MDX pages are RSC by default, importing hook-backed SDK components directly into MDX crashed the build with createContext/useState-in-RSC errors. The fix is to funnel all SDK imports through a 'use client'-marked file; MDX pages now import Upload* from '@/components/preview-components' while the user-facing code fences still show 'from @uploadkitdev/react'."
  - "ComponentPreview globally registered via getMDXComponents so MDX files never need to import the wrapper — only the underlying SDK component."
  - "Orbit satellite positioning uses CSS custom properties (--uk-orbit-angle, --uk-orbit-radius) driven by inline style, with `translate(cos()*r, sin()*r)`. CSS transition handles the radius collapse animation for both motion and non-motion paths."
  - "StepWizard reuses .uk-progress-bar__track/__fill from the new progress bar block instead of defining a third set of styles — single source of truth for progress visuals."
  - "Particles use a single --uk-progress CSS custom property on the container; per-particle transforms read (1 - var(--uk-progress)) * particleXY. One state write, N particles animate — cheaper than per-particle transform updates."
metrics:
  duration: "~35m"
  completed: "2026-04-10"
  tasks: 4
  commits: 4
---

# Quick 260410-kw3: Motion & Progress components + live docs previews

Ship eight motion-forward `@uploadkitdev/react` components (progress radial/bar/stacked/orbit + cloud-rain/bento/particles/step-wizard) and wire live, interactive previews into every premium SDK component docs page in Fumadocs.

## Tasks

| # | Name | Commit |
|---|------|--------|
| 1 | 4 progress components (Radial, Bar, Stacked, Orbit) + styles.css kw3 block + reduced-motion list extension + index.ts exports | `7d564f8` |
| 2 | 4 motion-heavy components (CloudRain, Bento, Particles, StepWizard) + index.ts re-exports | `165b598` |
| 3 | Docs infra: ComponentPreview wrapper, preview-components client boundary, mdx.tsx registration, styles.css import, 16 MDX pages (8 retrofit + 8 new), meta.json, api-reference.mdx | `0eac652` |
| 4 | apps/web showcase: Motion & Progress section with 8 new Cards | `b6ae738` |

## Per-component design notes

**UploadProgressRadial** — activity ring using Motion `pathLength` when available, `strokeDashoffset` fallback. Center shows label / live file name / percent / "Done". On success, `data-state="success"` triggers a `uk-ring-splash` scale keyframe. `role="button"` outer, `role="progressbar"` on the center label. Inspiration: Linear attachments, Apple Health activity ring.

**UploadProgressBar** — pure CSS progress bar. Four resolved states (idle | indeterminate | uploading | success). Indeterminate drives a 30%-width sliding animation via `uk-bar-indeterminate` keyframe; uploading state enables a `uk-bar-shimmer-sweep` over the fill; success swaps to `--uk-success` and renders a CSS-animated check. ARIA omits `aria-valuenow` in indeterminate mode per spec. Inspiration: Vercel build logs, Linear CI bars.

**UploadProgressStacked** — multi-file list using `useUploadKitContext` + `processFiles` from the glass dropzone canonical pattern (CONCURRENCY=3). Successful rows sort to the top via React state + Motion `layout`/`layoutId` for smooth reorder. CSS fallback: no reorder animation but ordering still applied. Inspiration: iOS AirDrop, Telegram multi-send.

**UploadProgressOrbit** — satellites positioned on a circle via CSS `transform: translate(cos(--angle)*--radius, sin(--angle)*--radius)`. Per-file progress collapses its own radius toward 0. Ring spin via `animation: uk-orbit-spin 6s linear infinite`. Aggregate `aria-valuenow` averages all file progresses. Inspiration: Arc browser, Raycast command palette.

**UploadCloudRain** — inline SVG cloud path with a `<clipPath>`-masked rect whose `y`/`height` reflect aggregate progress. Selected-but-not-done files render per-drop `<span>`s that use `uk-rain-drop` keyframe with staggered `animation-delay`. Inspiration: iCloud sync, Dropbox onboarding.

**UploadBento** — CSS Grid with `grid-auto-flow: dense` and `repeat(var(--uk-bento-cols,3), 1fr)`; every 3rd cell gets `data-span="2"` to span 2 columns. Each cell is a mini upload card (icon / name / size / mini progress bar). Motion `layout` + `layoutId` for smooth reorder when completed cells float to the top. Inspiration: Apple iPadOS widgets, Raycast themes grid.

**UploadParticles** — N particles (default 40) placed at deterministic random positions (computed once in `useMemo`). Each particle reads its own `--uk-particle-x/y`; container writes `--uk-progress`. Transform: `translate(calc(--x * (1 - --progress)), calc(--y * (1 - --progress)))`. Pure CSS transforms, no canvas / WebGL. Inspiration: Stripe 3DS loading, Vercel Ship hero.

**UploadStepWizard** — 5-stage state machine (`select → preview → confirm → upload → done`). Single-file via `useUploadKit`. Object URLs revoked on unmount + every reset. Motion path uses `AnimatePresence` with `mode="wait"` and slide-in transitions; CSS fallback uses a single `uk-stepwizard-slide-in` keyframe per panel mount. Inspiration: Stripe Checkout, Apple Pay add-card sheet.

## Docs infrastructure

- **`ComponentPreview`** — `'use client'` wrapper with a fake `/api/uploadkit-docs-noop` endpoint inside a dark stage (radial indigo glow + hairline border, 280px min-height). Registered globally in `getMDXComponents` so MDX files never need to import the wrapper itself.
- **`preview-components.tsx`** — a `'use client'` re-export of every SDK component used in MDX. MDX files import from `@/components/preview-components` instead of `@uploadkitdev/react` (see Deviations). User-facing code fences still show `from '@uploadkitdev/react'` — the boundary is only for MDX tag usage.
- **16 MDX pages** — all 8 existing ju7 premium pages got a `<ComponentPreview>` block between the Callout and the "Basic usage" heading; all 8 new pages are full Fumadocs pages (title, description, Callout, preview, basic usage, props table, behavior, theming, accessibility).
- **`meta.json`** — 8 new pages inserted after `upload-inline-chat` and before `use-uploadkit`.
- **`api-reference.mdx`** — new "Motion & Progress variants" section with prop tables / cross-links for all 8.

## Deviations from Plan

### [Rule 3 — Blocking issue] Preview components client boundary

**Found during:** Task 3 (first docs build attempt)
**Issue:** Importing SDK components directly inside MDX files (`import { UploadDropzoneGlass } from '@uploadkitdev/react'`) crashed the docs build with 53 `createContext/useState/useEffect is only available in Client Components` errors. MDX pages in Fumadocs are React Server Components by default, so any import chain that pulls hook-backed code into the server graph fails.
**Fix:** Added `apps/docs/src/components/preview-components.tsx` — a file marked `'use client'` that re-exports every SDK component used by the docs. All 16 MDX pages now import their preview components from `@/components/preview-components`. The Fumadocs code-fence `import { ... } from '@uploadkitdev/react'` samples inside ```tsx blocks were restored via awk to show the user-facing module name, not the internal docs-only boundary module.
**Files modified:** `apps/docs/src/components/preview-components.tsx` (new); all 16 MDX pages (`apps/docs/content/docs/sdk/react/*.mdx`).
**Commit:** `0eac652`

No other deviations — the remainder of the plan executed verbatim.

## Build verification

All four required builds pass:

| Command | Result |
|---|---|
| `pnpm --filter @uploadkitdev/react typecheck` | PASS |
| `pnpm --filter @uploadkitdev/react build` | PASS (dist/index.mjs 146 KB, dist/styles.css 37.6 KB, 17 new identifier lines in dist/index.d.ts) |
| `pnpm --filter @uploadkitdev/docs build` | PASS (72 static pages generated) |
| `pnpm --filter @uploadkitdev/web build` | PASS (7 static pages including /test/components) |

## Verification matrix (from plan)

- SDK shape check: `grep -c ".../dist/index.d.ts"` → **17** (≥ 16 required) ✓
- MDX preview coverage: `grep -l "<ComponentPreview" *.mdx | wc -l` → **16** (≥ 16 required) ✓
- Showcase coverage: 5 new identifiers in showcase → **15 matches** (multiple usages; ≥ 5 required) ✓
- Reduced-motion coverage: all 8 new class roots present inside the `@media (prefers-reduced-motion: reduce)` block in `styles.css` ✓
- Full build sweep: all four builds green ✓

## Self-Check: PASSED

- `packages/react/src/components/upload-progress-radial.tsx` — FOUND
- `packages/react/src/components/upload-progress-bar.tsx` — FOUND
- `packages/react/src/components/upload-progress-stacked.tsx` — FOUND
- `packages/react/src/components/upload-progress-orbit.tsx` — FOUND
- `packages/react/src/components/upload-cloud-rain.tsx` — FOUND
- `packages/react/src/components/upload-bento.tsx` — FOUND
- `packages/react/src/components/upload-particles.tsx` — FOUND
- `packages/react/src/components/upload-step-wizard.tsx` — FOUND
- `apps/docs/src/components/component-preview.tsx` — FOUND
- `apps/docs/src/components/preview-components.tsx` — FOUND
- 8 new MDX pages at `apps/docs/content/docs/sdk/react/upload-{progress-radial,progress-bar,progress-stacked,progress-orbit,cloud-rain,bento,particles,step-wizard}.mdx` — FOUND
- Commits: `7d564f8`, `165b598`, `0eac652`, `b6ae738` — all present in `git log`
