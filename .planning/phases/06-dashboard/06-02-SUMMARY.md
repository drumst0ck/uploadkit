---
phase: 06-dashboard
plan: "02"
subsystem: dashboard
tags: [overview, metrics, recharts, project-crud, slug-routing, swr]
dependency_graph:
  requires: [06-01]
  provides: [overview-page, project-crud, slug-routing]
  affects: [dashboard-layout, project-switcher]
tech_stack:
  added: [recharts-area-chart]
  patterns: [server-component-db-queries, swr-client-hooks, slug-based-routing, userid-scoped-queries]
key_files:
  created:
    - apps/dashboard/src/components/metric-card.tsx
    - apps/dashboard/src/components/charts/uploads-area-chart.tsx
    - apps/dashboard/src/app/api/internal/overview/route.ts
    - apps/dashboard/src/app/api/internal/projects/route.ts
    - apps/dashboard/src/hooks/use-projects.ts
    - apps/dashboard/src/components/create-project-dialog.tsx
    - apps/dashboard/src/app/dashboard/projects/page.tsx
    - apps/dashboard/src/app/dashboard/projects/[slug]/layout.tsx
    - apps/dashboard/src/app/dashboard/projects/[slug]/page.tsx
  modified:
    - apps/dashboard/src/app/dashboard/page.tsx
decisions:
  - "File queries scoped via user projectIds (IFile.projectId not IFile.userId) — IFile model links to projectId, userId not a field on File"
  - "UsageRecord fields are storageUsed and bandwidth (not bandwidthUsed) — matched actual Mongoose schema"
  - "Project sub-layout uses notFound() for missing/cross-user slugs — more correct than redirect for 404 semantics"
  - "Single-project auto-redirect on projects page — UX shortcut when user has exactly 1 project"
metrics:
  duration: "~20m"
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_created: 9
  files_modified: 1
---

# Phase 06 Plan 02: Overview Page, Metric Cards, and Project CRUD Summary

**One-liner:** Live overview dashboard with 4 DB-backed metric cards, 30-day Recharts area chart, recent files table, and project CRUD with nanoid-unique slug routing.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Overview page with metric cards, upload chart, and recent files | 6fcf7fe | metric-card.tsx, uploads-area-chart.tsx, dashboard/page.tsx, api/internal/overview/route.ts |
| 2 | Project CRUD with slug-based routing and project sub-layout | 572a304 | api/internal/projects/route.ts, use-projects.ts, create-project-dialog.tsx, projects/page.tsx, [slug]/layout.tsx, [slug]/page.tsx |

## What Was Built

### Task 1 — Overview Page
- **MetricCard** component: rounded-xl Vercel analytics-style card with label, big value, icon, and optional trend indicator (emerald/red).
- **UploadsAreaChart**: Recharts `AreaChart` always inside `ResponsiveContainer` (per research Pitfall 4). Indigo gradient fill, subtle grid lines, dark custom tooltip, smart YAxis visibility (hidden for <6 data points).
- **Dashboard overview page** (server component): parallel `Promise.all` queries — current period `UsageRecord`, `File.countDocuments` (total + today), recent 5 files, 30-day aggregate. 4-column responsive MetricCards grid, area chart, recent files table with shadcn `Table`.
- **`/api/internal/overview`** route: same queries exposed as JSON for future client-side refresh, auth() guard, 401 if no session.

### Task 2 — Project CRUD
- **`/api/internal/projects`** GET+POST: auth() guard on both methods, userId from session (never request body). POST generates slug via `name.toLowerCase().replace(spaces→hyphens).replace(non-alphanumeric→'') + nanoid(6)` for guaranteed uniqueness. Name validated 1–50 chars.
- **`useProjects`** SWR hook: `useSWR('/api/internal/projects', fetcher)` returning `{ projects, isLoading, error, mutate }`. Used by `ProjectSwitcher` (already consuming same endpoint) and `CreateProjectDialog`.
- **`CreateProjectDialog`**: Dialog with name Input, submit disabled during loading, SWR `mutate()` on success before redirect to new project slug.
- **Projects list page** (server component): auto-redirects to slug when exactly 1 project exists. Shows grid of project cards with name, slug badge, created date. "New project" button triggers `CreateProjectDialog`.
- **`/dashboard/projects/[slug]/layout.tsx`**: validates `slug + userId` via `Project.findOne` — cross-user slug access returns `notFound()`. Passes children through for nested pages.
- **`/dashboard/projects/[slug]/page.tsx`**: redirects to `/files` sub-page.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] IFile model has no userId field — scoped by projectId**
- **Found during:** Task 1 implementation
- **Issue:** Plan instructed `File.countDocuments({ userId, ... })` but `IFile` has no `userId` field — files are linked via `projectId` (a MongoDB ObjectId referencing the project).
- **Fix:** First fetch `Project.find({ userId }).select('_id slug').lean()` to get the user's project IDs, then scope all File queries with `{ projectId: { $in: projectIds } }`.
- **Files modified:** apps/dashboard/src/app/dashboard/page.tsx, apps/dashboard/src/app/api/internal/overview/route.ts

**2. [Rule 1 - Bug] UsageRecord field names differ from plan interfaces**
- **Found during:** Task 1 implementation
- **Issue:** Plan's interface showed `bandwidthUsed` and `uploadsCount` but the actual Mongoose schema defines `bandwidth` and `uploads`.
- **Fix:** Used correct field names `usage?.bandwidth` and `usage?.storageUsed` from the actual model.
- **Files modified:** apps/dashboard/src/app/dashboard/page.tsx, apps/dashboard/src/app/api/internal/overview/route.ts

## Known Stubs

None — all 4 metric cards connect to real DB queries. Chart data comes from live `File.aggregate`. Project CRUD is fully functional.

## Threat Flags

None — all threat mitigations from the plan's threat model were implemented:
- T-06-05: POST project always uses `session.user.id`, never request body
- T-06-06: Project layout lookup includes `userId: session.user.id` guard
- T-06-07: All overview queries filtered by userId-scoped projectIds
- T-06-08: Name validated 1–50 chars before DB operation

## Self-Check: PASSED
