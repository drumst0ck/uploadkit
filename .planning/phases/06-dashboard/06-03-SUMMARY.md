---
phase: 06-dashboard
plan: 03
subsystem: ui
tags: [tanstack-table, swr, file-browser, api-keys, file-routes, data-table, pagination]

requires:
  - phase: 06-01
    provides: Dashboard shell, auth, project layout, packages/ui components

provides:
  - Generic DataTable component with TanStack Table (manualPagination, row selection, sort)
  - File browser with cursor pagination, search, type filter, bulk delete
  - FilePreviewCell rendering image thumbnails and MIME-type icons
  - BulkActionsBar with AlertDialog confirmation
  - useFiles SWR hook with cursor/search/type params
  - GET+DELETE /api/internal/projects/[slug]/files (cursor pagination, bulk soft-delete)
  - GET+POST+DELETE /api/internal/projects/[slug]/keys (keyHash never returned, one-time key)
  - GET+POST+PUT+DELETE /api/internal/projects/[slug]/routes (file router CRUD)
  - ApiKeysTable with masked display, one-time key copy dialog, revoke confirmation
  - FileRoutesTable with CRUD dialogs, Badge per allowed type
  - /dashboard/projects/[slug]/files, /keys, /routes pages

affects: [07-logs, 08-billing, sdk-integration]

tech-stack:
  added: [mongoose (direct dep in dashboard for ObjectId validation)]
  patterns:
    - SWR fetch pattern with fetcher utility for all client-side data
    - Cursor stack array for prev/next pagination (push nextCursor, pop for previous)
    - ColumnDef<TData, unknown>[] cast for TanStack Table TValue generics under exactOptionalPropertyTypes
    - Conditional spread for optional TanStack Table options (getRowId, onRowSelectionChange)
    - Ownership check (projectId + userId) before every mutation (T-06-10, T-06-11)

key-files:
  created:
    - apps/dashboard/src/components/data-table/data-table.tsx
    - apps/dashboard/src/components/data-table/data-table-toolbar.tsx
    - apps/dashboard/src/components/data-table/data-table-pagination.tsx
    - apps/dashboard/src/components/file-browser/file-browser.tsx
    - apps/dashboard/src/components/file-browser/file-preview-cell.tsx
    - apps/dashboard/src/components/file-browser/bulk-actions-bar.tsx
    - apps/dashboard/src/hooks/use-files.ts
    - apps/dashboard/src/app/api/internal/projects/[slug]/files/route.ts
    - apps/dashboard/src/app/api/internal/projects/[slug]/keys/route.ts
    - apps/dashboard/src/app/api/internal/projects/[slug]/routes/route.ts
    - apps/dashboard/src/components/api-keys-table.tsx
    - apps/dashboard/src/components/file-routes-table.tsx
    - apps/dashboard/src/app/dashboard/projects/[slug]/files/page.tsx
    - apps/dashboard/src/app/dashboard/projects/[slug]/keys/page.tsx
    - apps/dashboard/src/app/dashboard/projects/[slug]/routes/page.tsx
  modified:
    - apps/dashboard/package.json (added mongoose direct dep)
    - pnpm-lock.yaml

key-decisions:
  - "mongoose added as direct dep to apps/dashboard — required for Types.ObjectId and isValidObjectId in internal API routes (same pattern as apps/api)"
  - "ColumnDef<FileRecord, unknown>[] cast used at DataTable call site — createColumnHelper infers TValue=string but DataTable generic defaults to unknown; cast is safe and avoids any"
  - "Conditional spread for optional TanStack Table props — exactOptionalPropertyTypes:true rejects undefined passed to required function types; conditional spread omits keys entirely"
  - "Cursor stack (string[]) for bi-directional pagination — push nextCursor for next, pop for previous; O(1) state, no cursor history size limit needed at this scale"
  - "Row selection reset on cursor change via useRef comparison — ensures stale checkbox state doesn't persist across page boundaries (Pitfall 6)"

patterns-established:
  - "Ownership gate: every mutation route does Project.findOne({ slug, userId: session.user.id }) before touching data — never trust client-provided projectId"
  - "T-06-09 compliance: ApiKey GET always uses .select('-keyHash'); POST returns fullKey once in response body, never stored or re-returned"
  - "AlertDialog inside DropdownMenuItem: onSelect={(e) => e.preventDefault()} prevents menu closing before dialog opens"
  - "SWR mutate() called after every mutation for immediate cache invalidation without full page reload"

requirements-completed: [DASH-04, DASH-05, DASH-06]

duration: 15min
completed: 2026-04-08
---

# Phase 06 Plan 03: File Browser, API Keys, and File Routes Summary

**TanStack Table file browser with cursor pagination + bulk delete, API keys with one-time display, and file routes CRUD — all project-scoped with session ownership enforcement**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-08T18:50:30Z
- **Completed:** 2026-04-08T18:59:01Z
- **Tasks:** 2
- **Files modified:** 15 created, 2 modified

## Accomplishments

- Generic DataTable (TanStack Table, manualPagination) with skeleton loading and empty state; file browser with 7 columns: select, preview, name, size, type, createdAt, actions
- Cursor-based pagination using a cursor stack array for both forward and backward navigation; row selection resets on page change
- API Keys table: masked display (`uk_live_xxx...`), one-time full key copy dialog on creation, AlertDialog revoke confirmation; SHA256 keyHash never returned
- File Routes table: full CRUD with Dialog form (slug, multi-select MIME types, max size/count, webhook URL), Badge per allowed type, AlertDialog delete confirmation
- All internal API routes enforce session ownership: `Project.findOne({ slug, userId: session.user.id })` before every read/write

## Task Commits

1. **Task 1: Generic DataTable + File browser** - `0ea61b2` (feat)
2. **Task 2: API Keys management + File Routes configuration** - `715498e` (feat)

**Plan metadata:** _(doc commit hash follows)_

## Files Created/Modified

- `apps/dashboard/src/components/data-table/data-table.tsx` - Generic TanStack Table wrapper with skeleton/empty states
- `apps/dashboard/src/components/data-table/data-table-toolbar.tsx` - Debounced search + type filter Select + BulkActionsBar
- `apps/dashboard/src/components/data-table/data-table-pagination.tsx` - Prev/Next with cursor stack state
- `apps/dashboard/src/components/file-browser/file-browser.tsx` - Composes DataTable with 7 columns + useFiles SWR
- `apps/dashboard/src/components/file-browser/file-preview-cell.tsx` - img for image/*, lucide icons for other MIME types
- `apps/dashboard/src/components/file-browser/bulk-actions-bar.tsx` - Delete selected with AlertDialog count confirmation
- `apps/dashboard/src/hooks/use-files.ts` - SWR hook with slug/search/typeFilter/cursor params
- `apps/dashboard/src/app/api/internal/projects/[slug]/files/route.ts` - GET (cursor pagination) + DELETE (bulk soft-delete, T-06-11)
- `apps/dashboard/src/app/api/internal/projects/[slug]/keys/route.ts` - GET (no keyHash) + POST (full key once) + DELETE (revoke)
- `apps/dashboard/src/app/api/internal/projects/[slug]/routes/route.ts` - Full CRUD for file router configs
- `apps/dashboard/src/components/api-keys-table.tsx` - Masked key display, create dialog, revoke with AlertDialog
- `apps/dashboard/src/components/file-routes-table.tsx` - CRUD table with inline Dialog, Badge per type
- `apps/dashboard/src/app/dashboard/projects/[slug]/files/page.tsx` - Server shell for file browser
- `apps/dashboard/src/app/dashboard/projects/[slug]/keys/page.tsx` - Server shell for API keys
- `apps/dashboard/src/app/dashboard/projects/[slug]/routes/page.tsx` - Server shell for file routes
- `apps/dashboard/package.json` - Added mongoose direct dep for ObjectId validation

## Decisions Made

- **mongoose as direct dep in dashboard**: Required for `mongoose.isValidObjectId()` and `Types.ObjectId` in cursor/ID validation in internal API routes — same pattern already established in apps/api.
- **ColumnDef cast to `unknown`**: `createColumnHelper<FileRecord>()` infers string-typed columns but `DataTable<TData, TValue>` defaults TValue to `unknown`; safe cast at call site avoids loosening strictness globally.
- **Cursor stack over URL state**: Cursor history stored as in-memory `string[]` rather than URL query params — simpler for dashboard UX, no browser history pollution, sufficient for session-scoped browsing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed auth import path depth**
- **Found during:** Task 1 build
- **Issue:** Auth.ts is at `apps/dashboard/auth.ts`; route at `[slug]/files/` is 7 levels deep, not 6
- **Fix:** Corrected relative import from 6 to 7 `../` levels
- **Files modified:** `apps/dashboard/src/app/api/internal/projects/[slug]/files/route.ts`
- **Verification:** Build passed after fix

**2. [Rule 1 - Bug] Fixed TypeScript strict null access on cursor**
- **Found during:** Task 1 build (TypeScript check)
- **Issue:** `resultFiles[resultFiles.length - 1]._id` fails with `exactOptionalPropertyTypes` — array access returns `T | undefined`
- **Fix:** Extracted `lastFile` variable with null guard: `hasMore && lastFile ? String(lastFile._id) : null`
- **Files modified:** `apps/dashboard/src/app/api/internal/projects/[slug]/files/route.ts`
- **Verification:** TypeScript check passed

**3. [Rule 1 - Bug] Fixed TanStack Table optional prop spread for exactOptionalPropertyTypes**
- **Found during:** Task 1 build (TypeScript check)
- **Issue:** Passing `getRowId: undefined` to `useReactTable` fails strict optional property check
- **Fix:** Changed to `...(getRowId !== undefined ? { getRowId } : {})` conditional spread
- **Files modified:** `apps/dashboard/src/components/data-table/data-table.tsx`
- **Verification:** Build passed

---

**Total deviations:** 3 auto-fixed (1 blocking import path, 2 TypeScript strict mode bugs)
**Impact on plan:** All fixes were minor correctness issues caught at build time. No scope creep.

## Issues Encountered

- `mongoose` not in dashboard `package.json` — added with `pnpm add mongoose@latest`. This matches the existing pattern in `apps/api` (documented in STATE.md decisions).

## User Setup Required

None — no external service configuration required for this plan.

## Next Phase Readiness

- File browser, API keys, and file routes pages fully functional
- All three project sub-pages accessible at `/dashboard/projects/[slug]/{files,keys,routes}`
- Internal API routes ready for plan 04 (upload logs/overview metrics integration)
- No blockers for next plan

---
*Phase: 06-dashboard*
*Completed: 2026-04-08*
