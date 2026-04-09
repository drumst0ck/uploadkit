---
phase: quick
plan: 260409-fiq
subsystem: ui-primitives, dashboard, landing
tags: [ui-polish, dark-mode, hover-states, indigo-theming, accessibility]
dependency_graph:
  requires: []
  provides:
    - Premium dark-mode button variants with indigo shadow/glow
    - Refined table head/row/cell styling
    - Indigo focus ring input primitive
    - Sidebar active state with indigo left-border accent
    - MetricCard with icon wrapper, shadow, hover lift
    - Landing page CTAs with scale transforms and glow
  affects:
    - All dashboard pages consuming <Button> from @uploadkit/ui
    - All dashboard pages consuming <Table> primitives
    - All dashboard pages consuming <Input>
    - Landing page hero, features, pricing, CTA sections
tech_stack:
  added: []
  patterns:
    - cva variants for dark-mode premium button styling
    - Tailwind hover:shadow-lg + hover:-translate-y-* for lift animations
    - border moved from inline style to className to enable Tailwind hover overrides
key_files:
  created: []
  modified:
    - packages/ui/src/components/ui/button.tsx
    - packages/ui/src/components/ui/table.tsx
    - packages/ui/src/components/ui/input.tsx
    - apps/dashboard/src/components/layout/sidebar-nav.tsx
    - apps/dashboard/src/components/metric-card.tsx
    - apps/dashboard/src/components/api-keys-table.tsx
    - apps/dashboard/src/app/dashboard/projects/page.tsx
    - apps/dashboard/src/components/settings-form.tsx
    - apps/dashboard/src/app/dashboard/billing/page.tsx
    - apps/dashboard/src/app/globals.css
    - apps/dashboard/src/components/charts/uploads-area-chart.tsx
    - apps/web/src/app/page.tsx
    - apps/web/src/components/nav/navbar.tsx
decisions:
  - Button cva base uses rounded-lg (not rounded-md) for consistent premium feel across all variants
  - Pricing CTA split into two separate Link elements (featured vs non-featured) to allow distinct Tailwind hover classes without inline style conflict
  - Feature card border moved from inline style to className so Tailwind hover:border-white/[0.12] can override it
metrics:
  duration: ~8m
  completed: 2026-04-09
  tasks: 2
  files: 13
---

# Quick Task 260409-fiq: Comprehensive UI Polish — Buttons, Sidebar, Cards, Landing

**One-liner:** Premium dark-mode UI pass with indigo theming: cva button variants with shadow/glow, table header typography, input focus ring, sidebar active border accent, metric card lift, and landing CTA scale/glow transforms.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Upgrade UI primitives + dashboard component styling | 43f17b0 | button.tsx, table.tsx, input.tsx, sidebar-nav.tsx, metric-card.tsx, api-keys-table.tsx, projects/page.tsx, settings-form.tsx, billing/page.tsx, globals.css, uploads-area-chart.tsx |
| 2 | Landing page button/CTA and feature card polish | 25335eb | apps/web/src/app/page.tsx, navbar.tsx |

## What Was Built

### Task 1: UI Primitives + Dashboard

**Button (`packages/ui/src/components/ui/button.tsx`):**
- Replaced all stock shadcn variants with premium dark-mode versions
- `default`: `bg-indigo-600` with `shadow-md shadow-indigo-500/20`, hover glow (`hover:shadow-lg hover:shadow-indigo-500/30`), `active:bg-indigo-700`
- `destructive`: matching red treatment
- `outline`: `border-white/[0.10] bg-white/[0.03]` with hover border brightening
- `secondary`/`ghost`: white/opacity layering pattern
- `link`: indigo-400 with hover:indigo-300
- Base: `rounded-lg`, `transition-all duration-200`, indigo focus ring with `ring-offset-[#0a0a0b]`

**Table (`packages/ui/src/components/ui/table.tsx`):**
- `TableHead`: uppercase tracking, `bg-white/[0.02]`, `text-zinc-500`, `px-4 py-3`
- `TableRow`: `border-white/[0.06]`, `hover:bg-white/[0.04]`, `data-[state=selected]:bg-indigo-500/10`
- `TableCell`: `px-4 py-3` (was `p-2`)

**Input (`packages/ui/src/components/ui/input.tsx`):**
- `rounded-lg`, `border-white/[0.08]`, `bg-white/[0.03]`, `text-zinc-200`
- Hover: `border-white/[0.12]`
- Focus: `border-indigo-500/50` + `ring-2 ring-indigo-500/30`
- Placeholder: `text-zinc-600`

**Sidebar (`apps/dashboard/src/components/layout/sidebar-nav.tsx`):**
- Active state: `bg-indigo-500/10 text-white border-l-2 border-indigo-500 -ml-[1px]`
- Inactive hover: `hover:bg-white/[0.06] hover:text-zinc-100`
- `transition-all duration-150`

**MetricCard (`apps/dashboard/src/components/metric-card.tsx`):**
- Added `shadow-lg shadow-black/20`, hover lift (`hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30`)
- Icon wrapped in `<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">`
- Label upgraded from `text-zinc-500` to `text-zinc-400`

**Ad-hoc override removal:**
- `api-keys-table.tsx`: removed `className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 border-0"` from Create API Key button
- `projects/page.tsx`: removed `className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"` from both New project buttons (kept `gap-2`)
- `settings-form.tsx`: replaced raw `<button>` with `<Button>` from `@uploadkit/ui`; added `Button` to imports
- `billing/page.tsx`: replaced all raw `<button>` elements with `<Button>` variants; imported `Button` from `@uploadkit/ui`

**globals.css:** `--muted-foreground` bumped `#a1a1aa` → `#b4b4bd`

**Chart tooltip:** Added `backdrop-blur-sm shadow-black/40`, bg changed to `bg-[#141416]/90`

**Empty state icon:** `text-zinc-600` → `text-zinc-500`, wrapped in div with `drop-shadow-[0_0_8px_rgba(99,102,241,0.15)]`

### Task 2: Landing Page Polish

**Hero CTAs (`apps/web/src/app/page.tsx`):**
- "Start Building": `hover:scale-[1.02]`, `hover:shadow-[0_0_30px_-5px_rgba(250,250,250,0.4)]`, `active:scale-[0.98]`, `boxShadow: '0 0 20px -5px rgba(250,250,250,0.3)'`
- "Read the Docs": added `hover:bg-white/[0.06]`
- Copy button: replaced `hover:opacity-70` with `hover:text-zinc-300 hover:bg-white/[0.06] rounded-md p-1 -m-1`

**Feature cards:** Border moved from inline `style` to className (`border border-white/[0.06]`); added `hover:border-white/[0.12] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30`

**Pricing CTAs:** Split into featured/non-featured branches:
- Featured: `bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30`
- Non-featured: `border border-white/[0.12] text-white hover:bg-white/[0.06] hover:border-white/[0.18]`

**Final CTA:** Same glow/scale treatment as hero "Start Building"

**Navbar (`apps/web/src/components/nav/navbar.tsx`):** "Get Started" desktop button gets `hover:scale-[1.02] hover:shadow-[0_0_20px_-5px_rgba(250,250,250,0.25)]`

## Deviations from Plan

None — plan executed exactly as written, with one minor implementation detail:

The pricing CTA section used a single `<Link>` with conditional `style` prop. Since moving colors to Tailwind classes requires splitting the conditional, two separate `<Link>` elements were rendered (featured vs non-featured). This is cleaner than a ternary on `className` and avoids inline style/Tailwind specificity conflicts.

## Known Stubs

None. All changes are pure styling — no data stubs introduced.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes.

## Build Verification

```
pnpm turbo build --filter=@uploadkit/dashboard --filter=@uploadkit/web
Tasks: 8 successful, 8 total
```

Build passes with zero TypeScript errors.

## Self-Check: PASSED

- `packages/ui/src/components/ui/button.tsx` — modified, committed 43f17b0
- `apps/dashboard/src/app/globals.css` — modified, committed 43f17b0
- `apps/web/src/app/page.tsx` — modified, committed 25335eb
- `apps/web/src/components/nav/navbar.tsx` — modified, committed 25335eb
- Both commits confirmed in git log
