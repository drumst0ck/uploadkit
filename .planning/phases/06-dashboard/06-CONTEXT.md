# Phase 6: Dashboard - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete SaaS dashboard shell at `app.uploadkit.dev` — overview with live metrics, project management with sidebar switcher, file browser with DataTable, API keys management, file routes config UI, upload logs with polling, usage page with charts, billing page, settings, cmd+k command palette, collapsible sidebar, responsive, dark mode by default.

</domain>

<decisions>
## Implementation Decisions

### Layout & Navigation
- **D-01:** Collapsible sidebar — full width on desktop with labels, collapses to icon-only rail on toggle. Mobile: off-canvas drawer with overlay.
- **D-02:** Project switcher as sidebar dropdown — shows current project name + chevron, dropdown lists all projects. Quick switch without leaving current page.
- **D-03:** Auto-generated breadcrumbs in the header — Dashboard > Project Name > Files. Derived from URL path segments. Clickable for navigation.

### Data Tables
- **D-04:** TanStack Table (@tanstack/react-table) + shadcn DataTable pattern for file browser. Headless with full sorting, filtering, cursor pagination.
- **D-05:** File preview column — images show small thumbnail (from CDN URL), non-images show file type icon. Like Vercel blob storage UI.
- **D-06:** Bulk actions — checkbox column, select multiple files → "Delete selected" button appears above table. Confirmation dialog before delete.

### Charts & Metrics
- **D-07:** Recharts for all usage/metrics charts. Area chart for 30-day uploads, bar chart for usage breakdown.
- **D-08:** Metric cards: big number + sparkline or percentage change indicator. Vercel analytics card style.
- **D-09:** Data fetching via SWR (or React Query) — client-side with caching. Better for interactive tables with filters, pagination, and polling (upload logs).

### Command Palette
- **D-10:** cmdk package (pacocoursey) — same as Vercel/Linear. Headless, composable, accessible.
- **D-11:** Full scope: navigation (jump to any page) + search (files by name) + actions (create project, copy API key, toggle dark mode, sign out).

### Claude's Discretion
- SWR vs React Query choice (both are viable — Claude picks)
- Sidebar nav item ordering and icons
- Responsive breakpoint behavior details
- Settings page layout (profile, notifications, delete account)
- Billing page layout (current plan card, upgrade button, invoices)
- Upload logs polling implementation (SWR refreshInterval vs manual)
- File routes config UI design
- Chart color scheme and styling

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specification
- `UPLOADKIT-GSD.md` §4.1 — Dashboard pages and routes
- `UPLOADKIT-GSD.md` §4.2 — Dashboard design (sidebar, header, components, dark mode)

### Prior Phase Context
- `.planning/phases/02-authentication/02-CONTEXT.md` — D-01 (single /login), D-06 (/dashboard overview), D-07 (auto-create project)
- `.planning/phases/03-upload-flow-rest-api/03-CONTEXT.md` — D-01 (Next.js API routes), D-07 (Stripe-style errors), D-09 (QStash async webhooks)

### Existing Code
- `apps/dashboard/src/app/dashboard/layout.tsx` — Protected layout with session guard + sign-out (Phase 2)
- `apps/dashboard/src/app/dashboard/page.tsx` — Basic overview showing projects (Phase 2)
- `apps/dashboard/auth.ts` — Auth.js exports (auth, signIn, signOut)
- `packages/ui/` — shadcn/ui primitives available
- All API endpoints in `apps/api/src/app/api/v1/` — Phase 3 built the full REST API

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/ui/` — shadcn primitives (Button, Input, Dialog) — dashboard composes these
- `apps/dashboard/auth.ts` — auth(), signIn(), signOut() exports
- `apps/dashboard/src/app/dashboard/layout.tsx` — existing protected layout (will be replaced/expanded)
- `apps/dashboard/src/app/dashboard/page.tsx` — basic overview (will be replaced)
- All Phase 3 API endpoints — the dashboard consumes these via SWR

### Established Patterns
- Auth via `auth()` server function in layout
- `connectDB()` before data access
- Dark mode via Tailwind `dark:` classes + shadcn theme
- Phase 2 established the minimal header with brand + avatar + sign-out

### Integration Points
- Dashboard layout wraps all `/dashboard/*` routes
- Sidebar component renders at layout level
- Command palette registers at layout level (global cmd+k)
- SWR provider at layout level for global cache
- All data from API via `fetch('/api/v1/...')` with API key from session context

</code_context>

<specifics>
## Specific Ideas

- The existing Phase 2 dashboard layout is minimal (brand + avatar + sign-out header). Phase 6 replaces it with the full sidebar + header + main content layout.
- shadcn/ui components need to be initialized in packages/ui first (`npx shadcn@latest init` then add components as needed)
- The dashboard makes API calls to its own backend — it needs an internal API key or uses the session directly since dashboard is the same Next.js app that hosts the API. Consider using server components that call the DB directly (via connectDB) instead of going through the REST API for the dashboard's own data.
- Upload logs polling: SWR with `refreshInterval: 5000` is the simplest approach
- Billing page is a thin shell in Phase 6 — Stripe integration comes in Phase 7

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-dashboard*
*Context gathered: 2026-04-08*
