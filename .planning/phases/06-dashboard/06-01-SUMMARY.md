---
phase: 06-dashboard
plan: 01
subsystem: dashboard-layout
tags: [shadcn, sidebar, layout, theme, swr, breadcrumbs]
dependency_graph:
  requires:
    - packages/db (Project model, connectDB)
    - packages/shared (Tier types)
    - apps/dashboard/auth.ts (auth, signOut)
  provides:
    - packages/ui: 13 shadcn components + cn() utility
    - apps/dashboard layout shell: sidebar + header + providers
    - SWR global config via SWRProvider
    - ThemeProvider with dark mode default
    - cn(), fetcher(), formatBytes(), formatDate(), formatNumber() utilities
  affects:
    - All /dashboard/* routes (wrapped by new layout)
tech_stack:
  added:
    - swr (data fetching + caching)
    - next-themes (dark/light mode)
    - "@tanstack/react-table" (table utilities, used in later plans)
    - recharts (charts, used in later plans)
    - cmdk (command palette, used in later plans)
    - lucide-react (icons)
    - class-variance-authority (component variant system)
    - clsx + tailwind-merge (className utilities)
    - "@radix-ui/react-*" (12 Radix primitives for shadcn)
  patterns:
    - shadcn/ui New York style with zinc base color + CSS variables
    - SidebarProvider context pattern for collapsed state sharing
    - MobileMenuWrapper client component to lift useState from server layout
    - exactOptionalPropertyTypes compliance: all optional props typed as T | undefined
    - localStorage persistence for sidebar collapsed state with useEffect mount guard
    - suppressHydrationWarning on <html> for next-themes class injection
key_files:
  created:
    - packages/ui/components.json
    - packages/ui/src/lib/utils.ts
    - packages/ui/src/components/ui/button.tsx
    - packages/ui/src/components/ui/dialog.tsx
    - packages/ui/src/components/ui/alert-dialog.tsx
    - packages/ui/src/components/ui/input.tsx
    - packages/ui/src/components/ui/select.tsx
    - packages/ui/src/components/ui/checkbox.tsx
    - packages/ui/src/components/ui/dropdown-menu.tsx
    - packages/ui/src/components/ui/tooltip.tsx
    - packages/ui/src/components/ui/badge.tsx
    - packages/ui/src/components/ui/separator.tsx
    - packages/ui/src/components/ui/avatar.tsx
    - packages/ui/src/components/ui/table.tsx
    - packages/ui/src/components/ui/sheet.tsx
    - apps/dashboard/src/lib/cn.ts
    - apps/dashboard/src/lib/fetcher.ts
    - apps/dashboard/src/lib/format.ts
    - apps/dashboard/src/providers/theme-provider.tsx
    - apps/dashboard/src/providers/swr-provider.tsx
    - apps/dashboard/src/components/layout/sidebar.tsx
    - apps/dashboard/src/components/layout/sidebar-nav.tsx
    - apps/dashboard/src/components/layout/project-switcher.tsx
    - apps/dashboard/src/components/layout/header.tsx
    - apps/dashboard/src/components/layout/breadcrumbs.tsx
    - apps/dashboard/src/components/layout/mobile-menu-wrapper.tsx
    - apps/dashboard/src/components/theme-toggle.tsx
  modified:
    - packages/ui/src/index.ts (re-exports all 13 components + cn)
    - packages/ui/package.json (exports key fixed: './' -> '.', Radix deps added)
    - packages/ui/tsconfig.json (rootDir/outDir overrides + DOM lib)
    - apps/dashboard/package.json (swr, recharts, cmdk, next-themes, tanstack deps added)
    - apps/dashboard/next.config.ts (R2 CDN remote patterns added)
    - apps/dashboard/src/app/layout.tsx (ThemeProvider + SWRProvider wrappers)
    - apps/dashboard/src/app/dashboard/layout.tsx (full layout shell with Sidebar + Header)
decisions:
  - "packages/ui tsconfig overrides rootDir/outDir locally — tsconfig.library.json rootDir is relative to config package, explicit override required (same pattern as Phase 5)"
  - "packages/ui exports key changed from './' to '.' — '/' suffix causes module resolution failure when dashboard imports '@uploadkit/ui'"
  - "MobileMenuWrapper client component pattern — server layout (dashboard/layout.tsx) cannot use useState; thin client wrapper lifts mobile menu open state while keeping auth/DB code server-side"
  - "exactOptionalPropertyTypes: all optional React props typed as T | undefined throughout layout components"
  - "ThemeToggle uses mounted guard (useEffect) before rendering Sun/Moon icon — avoids next-themes hydration mismatch on first render"
  - "DOM lib added to packages/ui tsconfig — HTMLTableCellElement and similar DOM types unavailable without it"
metrics:
  duration: "8m"
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_created: 27
  files_modified: 6
---

# Phase 6 Plan 1: shadcn/ui Init + Dashboard Layout Shell Summary

**One-liner:** shadcn/ui manually initialized in packages/ui with 13 components, full collapsible sidebar+header layout shell wired to all /dashboard/* routes with SWR/theme providers.

## What Was Built

**Task 1 — packages/ui + dependencies:**
- Manually initialized shadcn/ui (New York style, zinc base, CSS variables) since `shadcn init` requires a framework app and packages/ui is a plain library
- Created all 13 shadcn components from source: button, dialog, alert-dialog, input, select, checkbox, dropdown-menu, tooltip, badge, separator, avatar, table, sheet
- Fixed packages/ui package.json exports (`"."` not `"./"`), tsconfig rootDir override, and DOM lib requirement
- Installed all Phase 6 dashboard dependencies: swr, @tanstack/react-table, recharts, cmdk, next-themes, lucide-react
- Created utility functions: cn(), fetcher(), formatBytes(), formatDate(), formatNumber()
- Added R2 CDN remote patterns to next.config.ts for thumbnail rendering

**Task 2 — Layout shell:**
- ThemeProvider (next-themes, defaultTheme="dark", suppressHydrationWarning)
- SWRProvider with global fetcher and revalidateOnFocus=false
- Collapsible Sidebar: 240px expanded / 56px icon-only rail, localStorage persistence, mobile Sheet drawer
- SidebarNav: 5 top-level items with icons + project-scoped sub-nav under /projects/[slug]/* routes
- ProjectSwitcher: DropdownMenu with SWR-powered list, server-side initial data for zero loading flash
- Header: mobile hamburger, desktop sidebar toggle, Breadcrumbs, search hint (⌘K), ThemeToggle, user avatar dropdown with sign-out
- Breadcrumbs: usePathname() → SEGMENT_LABELS map → clickable links except last segment
- ThemeToggle: Sun/Moon with mounted guard to avoid hydration mismatch
- MobileMenuWrapper: thin client component to lift mobile menu useState from server layout

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] shadcn CLI init failed on packages/ui**
- **Found during:** Task 1
- **Issue:** `pnpm dlx shadcn@latest init` exits with "We could not detect a supported framework" — shadcn CLI requires a Next.js/Vite app, not a plain TypeScript library package
- **Fix:** Created components.json manually with New York style config; wrote all 13 shadcn component files directly from shadcn source patterns
- **Files modified:** packages/ui/components.json + all 13 component files

**2. [Rule 1 - Bug] packages/ui tsconfig rootDir pointed at config package**
- **Found during:** Task 1 typecheck
- **Issue:** `tsconfig.library.json` sets `rootDir: "./src"` relative to packages/config, causing TS6059 errors for all packages/ui source files
- **Fix:** Added explicit `rootDir: "./src"` override in packages/ui/tsconfig.json (same pattern as Phase 5 decision log)
- **Files modified:** packages/ui/tsconfig.json

**3. [Rule 1 - Bug] DOM types missing from packages/ui tsconfig**
- **Found during:** Task 1 typecheck
- **Issue:** HTMLTableCellElement, HTMLTableCaptionElement not found — tsconfig.base.json only includes ES2022 lib, no DOM
- **Fix:** Added `"lib": ["ES2022", "DOM", "DOM.Iterable"]` to packages/ui/tsconfig.json
- **Files modified:** packages/ui/tsconfig.json

**4. [Rule 1 - Bug] packages/ui package.json exports key "./" vs "."**
- **Found during:** Task 1 build
- **Issue:** `"./": "./src/index.ts"` causes "Cannot find module '@uploadkit/ui'" — Node.js exports map requires `"."` for the package root
- **Fix:** Changed key from `"./"` to `"."`
- **Files modified:** packages/ui/package.json

**5. [Rule 1 - Bug] exactOptionalPropertyTypes violations in layout components**
- **Found during:** Task 2 build (2 iterations)
- **Issue:** Optional props typed as `?: string` not assignable to `string | undefined` under `exactOptionalPropertyTypes: true`
- **Fix:** Changed all optional prop types to `?: T | undefined` in SidebarProps, SidebarContent, ProjectSwitcherProps
- **Files modified:** sidebar.tsx, project-switcher.tsx

**6. [Rule 2 - Missing critical] MobileMenuWrapper client component**
- **Found during:** Task 2 implementation
- **Issue:** Plan specified Header + Sidebar rendered from dashboard/layout.tsx (server component), but mobile menu open state requires useState — server components cannot use React hooks
- **Fix:** Extracted thin MobileMenuWrapper client component that owns mobile open state, keeping all auth/DB code in the server layout
- **Files created:** apps/dashboard/src/components/layout/mobile-menu-wrapper.tsx

## Known Stubs

- ProjectSwitcher fetches from `/api/internal/projects` — this API route does not exist yet (created in a later Phase 6 plan). The SWR call will fail gracefully and fall back to `initialProjects` from server-side fetch. No UI breakage.

## Threat Flags

None. All components follow T-06-01 (auth guard in server layout), T-06-02 (only email/avatar from session), T-06-04 (internal API routes will require auth when created).

## Self-Check: PASSED

All created files verified present. Build passes with zero errors.
