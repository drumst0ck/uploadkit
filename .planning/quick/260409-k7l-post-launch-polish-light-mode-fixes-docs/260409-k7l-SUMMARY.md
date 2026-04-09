---
phase: quick
plan: 260409-k7l
subsystem: dashboard, web, docs, e2e
tags: [light-mode, portal-components, changelog, docs, e2e, theming]
one_liner: "Fix dark-hardcoded portal backgrounds for light mode, add /changelog page, document 7 SDK features, add 3 E2E smoke test specs"
depends_on: [260409-jdo]
provides: [changelog-page, sdk-feature-docs, e2e-smoke-tests, light-mode-portals]
affects: [packages/ui, apps/dashboard, apps/web, apps/docs, e2e]
tech_stack_added: []
tech_stack_patterns: [semantic-css-vars, fumadocs-mdx, playwright-smoke-tests]
key_files_created:
  - apps/web/src/app/changelog/page.tsx
  - apps/docs/content/docs/sdk/react/config-mode.mdx
  - apps/docs/content/docs/sdk/react/before-upload.mdx
  - apps/docs/content/docs/sdk/react/progress.mdx
  - apps/docs/content/docs/sdk/next/ssr-plugin.mdx
  - apps/docs/content/docs/sdk/next/backend-adapters.mdx
  - e2e/auth/auth.spec.ts
  - e2e/dashboard/dashboard.spec.ts
  - e2e/billing/billing.spec.ts
key_files_modified:
  - packages/ui/src/components/ui/dialog.tsx
  - packages/ui/src/components/ui/alert-dialog.tsx
  - packages/ui/src/components/ui/dropdown-menu.tsx
  - packages/ui/src/components/ui/select.tsx
  - apps/dashboard/src/components/command-palette.tsx
  - apps/dashboard/src/components/project-settings-form.tsx
  - apps/dashboard/src/components/settings-form.tsx
  - apps/dashboard/src/components/layout/project-switcher.tsx
  - apps/web/src/app/globals.css
  - apps/docs/content/docs/sdk/react/theming.mdx
  - apps/docs/content/docs/sdk/react/api-reference.mdx
  - apps/docs/content/docs/sdk/react/meta.json
  - apps/docs/content/docs/sdk/next/meta.json
decisions:
  - "Use var(--popover)/var(--popover-foreground)/var(--border) without fallback values in inline styles — fallbacks were the source of the light mode regression"
  - "bg-muted replaces bg-white/[0.02] for read-only fields — muted is visible in both light and dark mode"
  - "upload-flow.spec.ts not recreated — existing file already covers file browser and upload area page load"
metrics:
  duration: "~20 minutes"
  completed_date: "2026-04-09"
  tasks: 3
  files_created: 9
  files_modified: 13
---

# Quick 260409-k7l: Post-Launch Polish Summary

**One-liner:** Fix dark-hardcoded portal backgrounds for light mode, add /changelog page, document 7 SDK features, add 3 E2E smoke test specs.

## What Was Done

### Task 1 — Light mode fixes + changelog

**Root cause of light mode regressions:** The four base UI components (`dialog.tsx`, `alert-dialog.tsx`, `dropdown-menu.tsx`, `select.tsx`) had inline `style` objects using hardcoded dark fallback values:
- `backgroundColor: 'var(--popover, #141416)'` — the `#141416` fallback rendered when the CSS var wasn't resolved, producing black-on-white dialogs in light mode
- `border: '1px solid rgba(255, 255, 255, 0.06)'` — near-invisible white border on white background

**Fix:** Removed all hardcoded fallback values. Changed to `var(--popover)`, `var(--popover-foreground)`, and `var(--border)` — the existing `globals.css` `:root` block already defines correct light mode values for these tokens.

**Additional dashboard fixes:**
- `command-palette.tsx`: changed portal content from `bg-background` to `bg-popover text-popover-foreground` (portals should use popover tokens, not background tokens)
- `project-settings-form.tsx` and `settings-form.tsx`: replaced `bg-white/[0.02]` (near-invisible on light backgrounds) with `bg-muted` for read-only slug/email fields
- Fixed `text-foreground0` typo → `text-muted-foreground` in the 3 in-scope dashboard component files (command-palette, project-settings-form, settings-form, project-switcher)

**Changelog page (`/changelog`):**
- Created `apps/web/src/app/changelog/page.tsx` as a Server Component following the pricing page pattern
- Added v0.1.0 Initial Launch entry listing all 8 shipped features
- Added changelog CSS to `globals.css` — timeline-style two-column layout with version badge, matching landing page aesthetic
- Footer already had `{ label: 'Changelog', href: '/changelog' }` in the Product column — no change needed

### Task 2 — SDK documentation (7 new features)

All MDX files follow the existing `upload-button.mdx` frontmatter and import convention.

| File | Content |
|------|---------|
| `config-mode.mdx` | `config.mode` prop for UploadButton (auto default) and UploadDropzone (manual default), with code examples for each |
| `before-upload.mdx` | `onBeforeUploadBegin` hook — rename, filter, async resize examples; security callout that server validation still runs |
| `progress.mdx` | `uploadProgressGranularity` coarse/fine/all — custom progress bar example with state; performance callout |
| `ssr-plugin.mdx` | `NextSSRPlugin` + `extractRouterConfig` setup, props table, how-it-works explanation |
| `backend-adapters.mdx` | Express, Fastify, Hono adapter examples; config options table; note that endpoint prop is identical to Next.js |
| `theming.mdx` (updated) | Added `data-uk-element` attribute table, `data-state` values, direct CSS targeting, `withUk` Tailwind plugin setup (v3 and v4), full variants table, usage examples |
| `api-reference.mdx` (updated) | Added `config`, `onBeforeUploadBegin`, `uploadProgressGranularity` props to both UploadButton and UploadDropzone tables |

**meta.json updates:**
- `sdk/react/meta.json`: added `config-mode`, `before-upload`, `progress` entries (before `api-reference`)
- `sdk/next/meta.json`: added `ssr-plugin`, `backend-adapters` entries (before `api-reference`)

### Task 3 — E2E smoke tests

| File | Covers |
|------|--------|
| `e2e/auth/auth.spec.ts` | Login page renders, OAuth buttons visible, magic link input visible — uses empty storage state (unauthenticated) |
| `e2e/dashboard/dashboard.spec.ts` | Sidebar nav links (Overview, Usage, Billing, Settings), projects page loads, New project button visible |
| `e2e/billing/billing.spec.ts` | Billing page FREE tier display: Current Plan card, tier name, upgrade buttons, usage summary |

`e2e/upload/upload-flow.spec.ts` was not recreated — the existing file already covers navigating to a project, seeing the upload area, uploading a file, and verifying the file browser.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Fixed text-foreground0 typo in 4 in-scope files**
- **Found during:** Task 1 audit
- **Issue:** `text-foreground0` is an invalid Tailwind class (typo for `text-foreground` or `text-muted-foreground`). Present in command-palette, project-settings-form, settings-form, and project-switcher.
- **Fix:** Replaced all occurrences in the 4 in-scope dashboard component files with `text-muted-foreground` (the correct semantic token for secondary text).
- **Files modified:** command-palette.tsx, project-settings-form.tsx, settings-form.tsx, project-switcher.tsx
- **Note:** `text-foreground0` also appears in ~25 other dashboard files outside this task's scope — logged to deferred-items below.

### Deferred Items

`text-foreground0` typo remains in out-of-scope files:
- `apps/dashboard/src/app/login/page.tsx`
- `apps/dashboard/src/app/dashboard/billing/page.tsx`
- `apps/dashboard/src/app/dashboard/page.tsx`
- `apps/dashboard/src/components/api-keys-table.tsx`
- `apps/dashboard/src/components/usage-progress-bar.tsx`
- `apps/dashboard/src/components/charts/usage-bar-chart.tsx`
- `apps/dashboard/src/components/charts/uploads-area-chart.tsx`
- `apps/dashboard/src/app/dashboard/usage/page.tsx`
- `apps/dashboard/src/components/file-browser/file-browser.tsx`
- `apps/dashboard/src/components/upload-logs-table.tsx`
- And several more page files

These are secondary text labels and do not cause visible light mode breakage (they render as unstyled text, falling back to inherited color). A follow-up quick task should do a global `text-foreground0` → `text-muted-foreground` sweep across the dashboard.

## Known Stubs

None — all new pages and docs contain real content.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

All 9 created files confirmed present on disk. All 3 task commits confirmed in git log:
- `950f08b` fix(260409-k7l-1): light mode portal components + changelog page
- `cb2c971` docs(260409-k7l-2): add 6 new SDK feature docs + update api-reference and meta.json
- `29aaf67` test(260409-k7l-3): add E2E smoke tests for auth, dashboard nav, and billing

Builds verified clean:
- `@uploadkit/dashboard`: 8 successful tasks
- `@uploadkit/web`: included in dashboard build run
- `@uploadkit/docs`: 1 successful task, all 48+ MDX paths generated
