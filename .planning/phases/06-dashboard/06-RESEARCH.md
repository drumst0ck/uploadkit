# Phase 6: Dashboard - Research

**Researched:** 2026-04-08
**Domain:** Next.js 15 SaaS dashboard shell — sidebar layout, TanStack Table, Recharts, SWR, cmdk, shadcn/ui
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Collapsible sidebar — full width on desktop with labels, collapses to icon-only rail on toggle. Mobile: off-canvas drawer with overlay.
- **D-02:** Project switcher as sidebar dropdown — shows current project name + chevron, dropdown lists all projects. Quick switch without leaving current page.
- **D-03:** Auto-generated breadcrumbs in the header — Dashboard > Project Name > Files. Derived from URL path segments. Clickable for navigation.
- **D-04:** TanStack Table (@tanstack/react-table) + shadcn DataTable pattern for file browser. Headless with full sorting, filtering, cursor pagination.
- **D-05:** File preview column — images show small thumbnail (from CDN URL), non-images show file type icon. Like Vercel blob storage UI.
- **D-06:** Bulk actions — checkbox column, select multiple files → "Delete selected" button appears above table. Confirmation dialog before delete.
- **D-07:** Recharts for all usage/metrics charts. Area chart for 30-day uploads, bar chart for usage breakdown.
- **D-08:** Metric cards: big number + sparkline or percentage change indicator. Vercel analytics card style.
- **D-09:** Data fetching via SWR (or React Query) — client-side with caching. Better for interactive tables with filters, pagination, and polling (upload logs).
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | Auth.js v5 login/register (GitHub, Google, magic link) | Already implemented in Phase 2 — layout guard + session in place. Phase 6 only ensures it's wired into new layout. |
| DASH-02 | Overview page with 4 metric cards + 30-day upload chart + recent files table | SWR fetches /api/v1/usage + /api/v1/files. Recharts AreaChart. Metric card component with trend indicator. |
| DASH-03 | Project CRUD with slug-based routing | Server actions for create/edit/delete. Sidebar dropdown re-fetches project list. Route: /dashboard/projects/[slug]. |
| DASH-04 | File browser with DataTable (preview, name, size, type, date, actions), filters, search, pagination, bulk delete | TanStack Table v8 + shadcn DataTable. Cursor pagination from API. SWR for data. |
| DASH-05 | API Keys page (masked display uk_live_xxx…xxx, copy, create, revoke with confirmation) | Client component with SWR. Clipboard API for copy. AlertDialog for revoke confirmation. |
| DASH-06 | File Routes configuration UI per project | Form-based CRUD. shadcn Dialog for create/edit. Table for list. |
| DASH-07 | Upload logs page with polling (5s interval), filter by date/status/route | SWR refreshInterval:5000. API endpoint /api/v1/logs?since= already exists. |
| DASH-08 | Usage page with progress bars (% of tier limit), historical chart, breakdown by project | TIER_LIMITS from @uploadkit/shared. Recharts BarChart. /api/v1/usage/history. |
| DASH-09 | Billing page (current plan card, upgrade button, Stripe Billing Portal link, invoice history) | Thin shell — Stripe integration Phase 7. Static plan card with placeholder upgrade button. |
| DASH-10 | Settings page (profile, notifications, delete account) | Server action for profile update. AlertDialog for delete account confirmation. |
| DASH-11 | Command palette (cmd+k) for navigation | cmdk 1.1.1. Registered at layout level. Full keyboard navigation. |
| DASH-12 | Sidebar layout (collapsible), header with breadcrumbs/search/avatar | CSS custom property + localStorage for collapsed state. usePathname for breadcrumbs. |
| DASH-13 | Dark mode by default with toggle, responsive design | next-themes 0.4.6. Already dark-first in existing layout. `dark` class on <html>. |
| DASH-14 | Vercel/Linear/Supabase-inspired visual design with shadcn/ui | shadcn 4.2.0. zinc/indigo palette. `border-white/[0.06]` style already established. |
</phase_requirements>

---

## Summary

Phase 6 builds the complete SaaS management shell for `app.uploadkit.dev`. The existing codebase provides the auth foundation (Phase 2), all API endpoints (Phase 3), and minimal dashboard layout (basic header + main). Phase 6 replaces the minimal layout with the full product chrome: collapsible sidebar, breadcrumb header, SWR data layer, and eleven distinct pages.

The design system baseline is already established: dark background `#0a0a0b`, `border-white/[0.06]` borders, zinc/indigo palette, Tailwind v4, and shadcn/ui — all visible in the existing layout.tsx and globals.css. The critical task is initializing shadcn properly in `packages/ui` (currently a stub with an empty export), then adding the specific components needed per page.

The dashboard makes server-side DB calls directly via `connectDB()` for its own user data (overview, usage, settings) and client-side SWR calls through the REST API for interactive tables (files, logs). This hybrid approach avoids the awkward pattern of the dashboard calling its own REST API with an API key from session — instead, server components can query MongoDB directly using the authenticated session's `user.id`.

**Primary recommendation:** Initialize shadcn in `packages/ui` first (Wave 0), then build layout shell, then pages in dependency order: overview → projects → files → API keys → routes → logs → usage → billing → settings → command palette.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | 8.21.3 | Headless table primitives for file browser | Locked (D-04). Decoupled from rendering, full sorting/filtering/selection API. [VERIFIED: npm registry] |
| swr | 2.4.1 | Client-side data fetching with caching + polling | Locked (D-09). Simpler API than React Query for this use case. Built-in deduplication, revalidation, refreshInterval. [VERIFIED: npm registry] |
| recharts | 3.8.1 | Area + bar charts for usage/overview | Locked (D-07). Declarative SVG charts, React-native API, built-in responsiveness. [VERIFIED: npm registry] |
| cmdk | 1.1.1 | Command palette (cmd+k) | Locked (D-10). Same library used by Vercel/Linear. Accessible, headless, composable. [VERIFIED: npm registry] |
| shadcn (CLI) | 4.2.0 | Component scaffolding into packages/ui | Standard for project (DASH-14). Generates unstyled base, fully owned code. [VERIFIED: npm registry] |
| next-themes | 0.4.6 | Dark mode provider + toggle | Industry standard for Next.js dark mode. Required for DASH-13. [VERIFIED: npm registry] |
| lucide-react | 1.7.0 | Icon set | shadcn default icon set. Consistent with existing design. [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | 0.7.1 | Component variant system (cva) | shadcn component variants (Button sizes, states) |
| clsx | 2.1.1 | Conditional classname merging | All component className composition |
| tailwind-merge | 3.5.0 | Deduplicate Tailwind classes on merge | Combined with clsx via `cn()` utility |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SWR | React Query (TanStack Query) | React Query has more features (mutations, optimistic updates, devtools) but heavier API surface. SWR is sufficient: the dashboard does reads + SWR mutations for the few write paths. SWR chosen per Claude's Discretion. |
| Recharts | Victory, nivo, Chart.js | Recharts is the simplest React-native option with zero external deps beyond d3 internals. Locked (D-07). |
| cmdk | Kbar, headless-ui/combobox | cmdk is the Vercel/Linear choice, has first-class Next.js integration. Locked (D-10). |

**Installation (new deps not yet in dashboard/package.json):**
```bash
pnpm add swr @tanstack/react-table recharts cmdk next-themes lucide-react class-variance-authority clsx tailwind-merge --filter @uploadkit/dashboard
pnpm add lucide-react class-variance-authority clsx tailwind-merge --filter @uploadkit/ui
```

**shadcn init (run from packages/ui):**
```bash
# From repo root — targets packages/ui as the component library
pnpm dlx shadcn@latest init --cwd packages/ui
```
Then add specific components as needed per page.

---

## Architecture Patterns

### Recommended Project Structure
```
apps/dashboard/src/
├── app/
│   ├── layout.tsx                          # Root layout — next-themes provider, SWR provider
│   ├── globals.css                         # @import @uploadkit/config/tailwind/base.css (exists)
│   ├── dashboard/
│   │   ├── layout.tsx                      # REPLACE: full sidebar+header chrome (auth guard stays)
│   │   ├── page.tsx                        # REPLACE: overview with metric cards + chart
│   │   ├── projects/
│   │   │   ├── page.tsx                    # Project list (redirect to [slug] or create)
│   │   │   └── [slug]/
│   │   │       ├── layout.tsx              # Project sub-layout (sets active project context)
│   │   │       ├── page.tsx                # Project overview / redirect to /files
│   │   │       ├── files/page.tsx          # File browser DataTable
│   │   │       ├── keys/page.tsx           # API Keys management
│   │   │       ├── routes/page.tsx         # File Router config UI
│   │   │       ├── logs/page.tsx           # Upload logs with polling
│   │   │       └── settings/page.tsx       # Project settings
│   │   ├── usage/page.tsx                  # Usage + charts
│   │   ├── billing/page.tsx                # Billing thin shell
│   │   └── settings/page.tsx               # Account settings
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx                     # Collapsible sidebar (D-01)
│   │   ├── sidebar-nav.tsx                 # Nav items + active state
│   │   ├── project-switcher.tsx            # Dropdown project selector (D-02)
│   │   ├── header.tsx                      # Breadcrumbs + search trigger + avatar
│   │   └── breadcrumbs.tsx                 # URL-derived breadcrumbs (D-03)
│   ├── command-palette.tsx                 # cmdk Command component (D-10, D-11)
│   ├── data-table/
│   │   ├── data-table.tsx                  # Generic TanStack Table wrapper
│   │   ├── data-table-toolbar.tsx          # Search + filter controls
│   │   └── data-table-pagination.tsx       # Cursor pagination controls
│   ├── file-browser/
│   │   ├── file-browser.tsx                # Files page — SWR + DataTable composed
│   │   ├── file-preview-cell.tsx           # Thumbnail or type icon (D-05)
│   │   └── bulk-actions-bar.tsx            # Delete selected button (D-06)
│   ├── charts/
│   │   ├── uploads-area-chart.tsx          # 30-day uploads AreaChart
│   │   └── usage-bar-chart.tsx             # Usage breakdown BarChart
│   ├── metric-card.tsx                     # Big number + trend/sparkline (D-08)
│   ├── api-keys-table.tsx                  # Masked key display + actions
│   └── theme-toggle.tsx                    # Dark/light toggle
├── hooks/
│   ├── use-projects.ts                     # SWR hook for project list
│   ├── use-files.ts                        # SWR hook with cursor pagination
│   ├── use-usage.ts                        # SWR hook for usage data
│   └── use-logs.ts                         # SWR hook with refreshInterval
├── lib/
│   ├── fetcher.ts                          # SWR fetcher function
│   ├── format.ts                           # formatBytes, formatDate helpers
│   └── cn.ts                               # clsx + tailwind-merge utility
└── providers/
    ├── swr-provider.tsx                    # SWRConfig global cache config
    └── theme-provider.tsx                  # next-themes ThemeProvider
```

### Pattern 1: Hybrid Server/Client Data Fetching

**What:** Server components query MongoDB directly for initial page render. Client components use SWR for interactive/polling data. Dashboard does NOT use its own REST API with an API key — it uses session `user.id` directly in server components.

**When to use:** Server component for anything rendered on navigation (overview stats, project list). Client component + SWR for tables with filters/pagination/polling (file browser, logs).

```typescript
// Server component — direct DB query (no API hop)
// apps/dashboard/src/app/dashboard/page.tsx
import { auth } from '../../../auth';
import { connectDB, UsageRecord, File } from '@uploadkit/db';

export default async function OverviewPage() {
  const session = await auth();
  await connectDB();
  const userId = session!.user.id;
  
  const period = new Date().toISOString().slice(0, 7);
  const [usage, recentFiles] = await Promise.all([
    UsageRecord.findOne({ userId, period }).lean(),
    File.find({ /* project scoping needed */ }).sort({ _id: -1 }).limit(5).lean(),
  ]);
  
  return <OverviewUI usage={usage} recentFiles={recentFiles} />;
}
```

```typescript
// Client component — SWR for interactive file browser
// apps/dashboard/src/components/file-browser/file-browser.tsx
'use client';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

export function FileBrowser({ projectId }: { projectId: string }) {
  const [cursor, setCursor] = useState<string | null>(null);
  const { data, isLoading } = useSWR(
    `/api/v1/files?projectId=${projectId}&limit=20${cursor ? `&cursor=${cursor}` : ''}`,
    fetcher
  );
  // ...
}
```

**Key insight on API auth for dashboard:** The REST API uses API key auth via `withApiKey`. The dashboard cannot call these endpoints without an API key. The cleanest approach is:
1. Server components: bypass REST API, call DB directly using `session.user.id`
2. Client components needing CRUD: create dedicated server actions (not REST API calls) or create internal Next.js route handlers scoped by session (no API key needed — auth via session cookie)

### Pattern 2: Collapsible Sidebar with CSS Variable State

**What:** Sidebar width controlled by CSS custom property. Collapsed state persisted in localStorage. No JavaScript layout reflow.

```typescript
// components/layout/sidebar.tsx
'use client';
import { useState, useEffect } from 'react';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  return (
    <aside
      data-collapsed={collapsed}
      className="group/sidebar flex flex-col border-r border-white/[0.06] bg-[#0a0a0b]
                 w-60 data-[collapsed=true]:w-14 transition-[width] duration-200"
    >
      {/* Logo */}
      {/* Nav items — labels hidden when collapsed */}
      {/* Project switcher */}
    </aside>
  );
}
```

### Pattern 3: Auto-Generated Breadcrumbs from URL

```typescript
// components/layout/breadcrumbs.tsx
'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  files: 'Files',
  keys: 'API Keys',
  routes: 'File Routes',
  logs: 'Logs',
  usage: 'Usage',
  billing: 'Billing',
  settings: 'Settings',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-sm">
        {segments.map((segment, i) => {
          const href = '/' + segments.slice(0, i + 1).join('/');
          const label = SEGMENT_LABELS[segment] ?? segment;
          const isLast = i === segments.length - 1;
          return (
            <li key={href} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-zinc-600">/</span>}
              {isLast ? (
                <span className="text-zinc-300 font-medium">{label}</span>
              ) : (
                <Link href={href} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

### Pattern 4: TanStack Table with Cursor Pagination

```typescript
// The API returns { files, nextCursor, hasMore }
// TanStack Table is headless — rendering is 100% in our control

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type ColumnDef,
} from '@tanstack/react-table';

const columns: ColumnDef<FileRecord>[] = [
  { id: 'select', header: ({ table }) => <Checkbox ... />, cell: ({ row }) => <Checkbox ... /> },
  { accessorKey: 'preview', header: 'File', cell: ({ row }) => <FilePreviewCell file={row.original} /> },
  { accessorKey: 'name', header: 'Name', enableSorting: true },
  { accessorKey: 'size', header: 'Size', cell: ({ getValue }) => formatBytes(getValue<number>()) },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'createdAt', header: 'Uploaded', cell: ({ getValue }) => formatDate(getValue<string>()) },
  { id: 'actions', cell: ({ row }) => <FileActionsMenu file={row.original} /> },
];

const table = useReactTable({
  data: files ?? [],
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  // Cursor pagination is external — table does not manage pages
  manualPagination: true,
});
```

**Note on cursor pagination:** The API uses cursor-based pagination (`nextCursor`, `hasMore`). TanStack Table's `manualPagination: true` means the table renders whatever data SWR provides — the "next page" button calls `setCursor(data.nextCursor)`.

### Pattern 5: SWR Polling for Upload Logs

```typescript
// hooks/use-logs.ts
import useSWR from 'swr';

export function useLogs(projectApiKey: string) {
  const sinceRef = useRef(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  
  return useSWR(
    [`/api/v1/logs`, projectApiKey],
    ([url]) => fetcher(`${url}?since=${sinceRef.current}`),
    { refreshInterval: 5000 }  // 5s polling (D-07, Roadmap decision)
  );
}
```

**Problem with this approach:** The logs API requires an API key (`withApiKey`), not a session cookie. The dashboard needs to either:
1. Display the user's API key from their session context and pass it as a header in SWR fetches, OR
2. Create an internal dashboard API route that calls the DB directly (bypasses `withApiKey`)

**Recommendation (Claude's Discretion):** Create internal dashboard routes at `/app/api/internal/` (no API key auth, session-based) for all dashboard data fetching. This is cleaner and avoids exposing API keys in client-side code.

### Pattern 6: cmdk Command Palette

```typescript
// components/command-palette.tsx
'use client';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  
  return (
    <Command.Dialog open={open} onOpenChange={onClose} label="Global Command Palette">
      <Command.Input placeholder="Type a command or search..." />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>
        
        <Command.Group heading="Navigation">
          <Command.Item onSelect={() => { router.push('/dashboard'); onClose(); }}>
            Dashboard
          </Command.Item>
          {/* ... more nav items */}
        </Command.Group>
        
        <Command.Group heading="Actions">
          <Command.Item onSelect={handleCreateProject}>Create Project</Command.Item>
          <Command.Item onSelect={handleCopyApiKey}>Copy API Key</Command.Item>
          <Command.Item onSelect={handleToggleTheme}>Toggle Dark Mode</Command.Item>
          <Command.Item onSelect={handleSignOut}>Sign Out</Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
```

Register the `cmd+k` listener in `dashboard/layout.tsx`.

### Anti-Patterns to Avoid

- **Dashboard calling its own REST API with API keys:** The REST API uses `withApiKey` for external consumers. The dashboard should use session-based auth (server components or internal routes). [VERIFIED: existing auth.ts and withApiKey middleware design]
- **Sidebar state in URL:** Don't encode sidebar collapsed state in search params. Use localStorage. URL should only reflect navigation state.
- **SWR global fetcher without auth:** The default `fetch` won't include the session cookie on relative URL calls — but Next.js 15 server route handlers do receive the session cookie automatically on same-origin requests. Internal routes need no special auth headers.
- **Recharts outside ResponsiveContainer:** Always wrap charts in `<ResponsiveContainer width="100%" height={300}>`. Without this, charts break on resize. [ASSUMED]
- **Using `next/image` for CDN file thumbnails without configuring remotePatterns:** The R2 CDN domain must be added to `next.config.ts` `images.remotePatterns`. Otherwise thumbnails 400.
- **Initializing shadcn in apps/dashboard directly:** The `packages/ui` package is the shared component library. shadcn should be initialized there, not in the app. The existing `packages/ui/src/index.ts` is a stub ready for components.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table with sort/filter/select | Custom table component | @tanstack/react-table | Locked (D-04). Row selection state, column visibility, sorting state — all complex edge cases already solved. |
| Charts | SVG drawing code | recharts | Locked (D-07). Responsive, animated, tooltip, legend — 200+ hours of chart edge cases. |
| Command palette | Custom modal + input + results | cmdk | Locked (D-10). Keyboard navigation, ARIA roles, fuzzy matching — cmdk handles all of it. |
| Dark mode | Manual class toggling | next-themes | Handles SSR hydration mismatch (flash of wrong theme), system preference detection, localStorage persistence. |
| File type icons | Custom icon map | lucide-react (FileText, Image, Video, FileAudio, File) | Already in standard stack. Map MIME type prefix to icon. |
| Masked API key display | Manual string slice | Simple `${key.slice(0,12)}...${key.slice(-4)}` | This one IS simple enough to inline. |
| Byte formatting | Custom formatter | Simple `formatBytes()` utility in lib/format.ts | 2-line function, no library needed. |
| Responsive sidebar | CSS media queries + JS state | CSS `data-[collapsed]` + Tailwind variant | Tailwind `group-data-[]` pattern handles all states declaratively. |

**Key insight:** The "don't hand-roll" list is short because this project has clear locked decisions. The main risk is writing custom table/chart/palette code when battle-tested libraries are already chosen.

---

## Common Pitfalls

### Pitfall 1: next/image Remote Pattern Not Configured for R2 CDN
**What goes wrong:** `<Image>` component throws 400/500 for file thumbnails from CDN. Dev sees blank thumbnails silently.
**Why it happens:** Next.js blocks external image hosts unless explicitly allowlisted. The R2 CDN domain (e.g., `cdn.uploadkit.dev`) is not in `next.config.ts` at this point.
**How to avoid:** Add to `next.config.ts` before implementing file preview cells:
```typescript
images: {
  remotePatterns: [{ protocol: 'https', hostname: 'cdn.uploadkit.dev' }]
}
```
**Warning signs:** `<img>` works but `<Image>` shows error or blank.

### Pitfall 2: Hydration Mismatch in Sidebar Collapsed State
**What goes wrong:** Server renders sidebar expanded, client reads localStorage and renders collapsed → React hydration mismatch error.
**Why it happens:** localStorage is unavailable during SSR; initializing state from it synchronously causes server/client divergence.
**How to avoid:** Use `useEffect` to read localStorage after mount, or set initial state to `false` (expanded) and apply the stored preference in a `useEffect`. The brief flash of expanded sidebar on first load is acceptable.
```typescript
const [collapsed, setCollapsed] = useState(false); // always false on SSR
useEffect(() => {
  setCollapsed(localStorage.getItem('sidebar-collapsed') === 'true');
}, []);
```

### Pitfall 3: SWR Fetching Dashboard Data Through REST API (API Key Auth Problem)
**What goes wrong:** Client components try `fetch('/api/v1/files')` without an API key header → 401. The REST API uses `withApiKey` middleware, not session cookies.
**Why it happens:** Phase 3's API was designed for external SDK consumers, not for the dashboard's own use.
**How to avoid:** Create internal Next.js route handlers under `/app/api/internal/` that use `auth()` (session-based) and query the DB directly. These routes are only accessible from the dashboard app and don't require API keys.
**Warning signs:** 401 errors in browser dev tools on `/api/v1/*` requests from the dashboard client.

### Pitfall 4: Recharts + Tailwind Dark Mode
**What goes wrong:** Recharts uses inline SVG styles. Tailwind's `dark:` classes don't apply to SVG fill/stroke. Charts look broken in dark mode.
**Why it happens:** Recharts renders SVG with hardcoded color props, not CSS classes.
**How to avoid:** Use CSS custom property values for chart colors. Define chart colors in globals.css as `--chart-1`, `--chart-2`, etc. (shadcn convention). Pass them to Recharts via `stroke` and `fill` props using `var(--chart-1)`.

### Pitfall 5: cmdk Dialog Blocking Keyboard Shortcuts
**What goes wrong:** After cmd+k opens the command palette, other keyboard shortcuts stop working even after closing.
**Why it happens:** `Command.Dialog` uses a portal and can retain focus if `onOpenChange` is not correctly wired.
**How to avoid:** Always wire `open` and `onOpenChange` to the same state. Use `onKeyDown` on the Dialog to handle ESC explicitly if needed. Test focus restoration after close.

### Pitfall 6: TanStack Table Row Selection State Persists Across Pages
**What goes wrong:** User selects files on page 1, navigates to page 2 via cursor — selected rows from page 1 remain checked in the row selection state even though those rows are no longer rendered.
**Why it happens:** TanStack Table's `rowSelection` state uses row index by default, not row identity.
**How to avoid:** Use `getRowId` to bind selection to file ID:
```typescript
const table = useReactTable({
  getRowId: (row) => row._id,
  // ...
});
```
Also reset `rowSelection` when cursor changes.

### Pitfall 7: `export const dynamic = 'force-dynamic'` Required on All Dashboard Pages
**What goes wrong:** Next.js tries to statically prerender dashboard pages at build time → fails because `auth()` and `connectDB()` require runtime env vars.
**Why it happens:** Next.js 15 aggressively static-renders pages by default. The existing pages already have this export — any new page that calls `auth()` needs it too.
**How to avoid:** Add to `dashboard/layout.tsx` (already present). New leaf pages that call `auth()` directly also need it. Pages that only receive data as props from the layout do not need it.

---

## Code Examples

### SWR Fetcher (internal API pattern)
```typescript
// lib/fetcher.ts
// Fetches from internal dashboard API routes (session-based, no API key)
export const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Fetch error ' + res.status);
    return res.json();
  });
```

### Internal API Route (session-based, for client component SWR)
```typescript
// app/api/internal/projects/[slug]/files/route.ts
import { auth } from '@/auth';
import { connectDB, File, Project } from '@uploadkit/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  await connectDB();
  const project = await Project.findOne({ slug: params.slug, userId: session.user.id });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  
  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor');
  const limit = 20;
  
  const filter = cursor
    ? { projectId: project._id, _id: { $lt: cursor }, deletedAt: null }
    : { projectId: project._id, deletedAt: null };
  
  const files = await File.find(filter).sort({ _id: -1 }).limit(limit + 1).lean();
  const hasMore = files.length > limit;
  
  return NextResponse.json({
    files: files.slice(0, limit),
    nextCursor: hasMore ? files[limit - 1]!._id.toString() : null,
    hasMore,
  });
}
```

### Metric Card Component
```typescript
// components/metric-card.tsx
interface MetricCardProps {
  label: string;
  value: string;
  trend?: { value: number; label: string }; // e.g. { value: 12, label: 'vs last month' }
  icon?: React.ReactNode;
}

export function MetricCard({ label, value, trend, icon }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#141416] p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-zinc-500">{label}</span>
        {icon && <span className="text-zinc-600">{icon}</span>}
      </div>
      <p className="text-2xl font-semibold text-white tracking-tight">{value}</p>
      {trend && (
        <p className={`text-xs mt-1.5 ${trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
        </p>
      )}
    </div>
  );
}
```

### Usage Progress Bar (DASH-08)
```typescript
// Uses TIER_LIMITS from @uploadkit/shared — already in the codebase
import { TIER_LIMITS } from '@uploadkit/shared';

function UsageBar({ used, tier, metric }: { used: number; tier: Tier; metric: 'maxStorageBytes' }) {
  const limit = TIER_LIMITS[tier][metric];
  const pct = limit === Infinity ? 0 : Math.min(100, (used / limit) * 100);
  
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-400">{formatBytes(used)}</span>
        <span className="text-zinc-600">{limit === Infinity ? 'Unlimited' : formatBytes(limit)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-zinc-600">{pct.toFixed(1)}% used</p>
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router data fetching (getServerSideProps) | Server Components + server actions | Next.js 13+ | No getServerSideProps needed. `auth()` called directly in async server components. |
| shadcn in every app directly | shadcn in packages/ui, apps consume via workspace | Standard monorepo pattern | Components are shared, not duplicated across apps. |
| CSS variables for dark mode | next-themes + `dark` class | Standard since 2022 | Eliminates flash of wrong theme. System preference detection built-in. |
| Full-page table libraries (ag-Grid, react-data-grid) | Headless TanStack Table + custom render | ~2022-2023 | Full styling control, no library CSS conflicts with Tailwind v4. |

**Deprecated/outdated:**
- `getServerSideProps`: Not used in App Router. Server components replace it.
- `next/router` (Pages): Use `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`) in App Router.
- React Query v3 `useQuery` with `onSuccess`: Replaced by `useEffect` or SWR's `onSuccess` in newer versions. SWR has no breaking API changes to worry about at 2.4.1.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Recharts needs `ResponsiveContainer` wrapper or breaks on resize | Don't Hand-Roll / Pitfalls | Low risk — easy fix if wrong, but plan should include ResponsiveContainer in all chart components |
| A2 | Internal `/api/internal/` routes pattern is the right solution for session-based dashboard data fetching | Architecture Patterns | Medium risk — alternative is server actions for mutations + server components for reads (no SWR). If internal routes are rejected, all interactive data pages need redesign. |
| A3 | `packages/ui` should be the shadcn target, not `apps/dashboard` directly | Architecture Patterns | Low risk — project spec clearly states packages/ui is the shared UI layer. The stub index.ts confirms intent. |

---

## Open Questions

1. **Project context in server components across nested routes**
   - What we know: `/dashboard/projects/[slug]/files` needs the current project's MongoDB `_id` to query files
   - What's unclear: How does the `[slug]` server component pass project data down to client components efficiently? Options: (a) create a `ProjectContext` in a `[slug]/layout.tsx` server component, (b) pass as props, (c) each client component fetches project by slug independently
   - Recommendation: Use `[slug]/layout.tsx` as a server component that fetches the project and passes it down as props. For client components needing the project ID, include it in the internal API route URL (slug-based).

2. **shadcn components needed — complete list**
   - What we know: Button, Dialog, AlertDialog, Table, Input, Select, Checkbox, DropdownMenu, Tooltip, Badge, Separator, Avatar are all needed
   - What's unclear: Whether to add all at once in Wave 0 or add per-feature
   - Recommendation: Add all in Wave 0 shadcn init wave. Running the CLI multiple times is fine but doing it once avoids repeated setup.

3. **Billing page data source**
   - What we know: Phase 9 (Billing) adds Stripe. Phase 6 is a thin shell.
   - What's unclear: What real data is available for the billing page now? Subscription tier is in the `Subscription` model, but no Stripe data exists yet.
   - Recommendation: Billing page in Phase 6 shows the current tier from the `Subscription` MongoDB record (tier = FREE by default from auth signup). Show plan features, upgrade CTA button (disabled/placeholder). No Stripe calls.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All builds | ✓ | 22 LTS (Darwin) | — |
| pnpm | Package installs | ✓ | (monorepo established) | — |
| shadcn CLI | packages/ui init | ✓ | 4.2.0 (via pnpm dlx) | — |
| MongoDB (MONGODB_URI) | connectDB() in server components | ✓ | Atlas (Phase 1) | — |
| Auth.js session | Dashboard auth guard | ✓ | Phase 2 complete | — |
| Phase 3 API endpoints | Reference only (internal routes replace direct use) | ✓ | All built | — |
| R2 CDN domain (cdn.uploadkit.dev) | next/image remotePatterns for thumbnails | ✓ | Phase 1 configured | Use `<img>` with no optimization as fallback |

**No blocking missing dependencies.**

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test config files in apps/dashboard |
| Config file | None — Wave 0 gap |
| Quick run command | N/A until framework installed |
| Full suite command | N/A until framework installed |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Auth guard redirects unauthenticated users | manual-only | — (auth flow E2E, out of scope for Phase 6) | ❌ |
| DASH-02 | Overview page renders metric cards | smoke | `pnpm --filter @uploadkit/dashboard build` (build smoke) | ❌ Wave 0 |
| DASH-03 | Project CRUD creates/deletes project in DB | integration | manual (DB side effect) | ❌ |
| DASH-04 | File browser renders DataTable with data | smoke | build smoke | ❌ Wave 0 |
| DASH-05 | API key masked display `uk_live_xxx...xxx` | unit | `pnpm test -t 'maskApiKey'` | ❌ Wave 0 |
| DASH-06 | File routes config form validates fields | unit | `pnpm test -t 'fileRouteForm'` | ❌ Wave 0 |
| DASH-07 | Logs polling fires every 5s | manual-only | — (timer/interval testing, use manual verification) | ❌ |
| DASH-08 | Usage percentages calculated from TIER_LIMITS | unit | `pnpm test -t 'usagePct'` | ❌ Wave 0 |
| DASH-11 | cmd+k opens command palette | manual-only | — (keyboard event E2E) | ❌ |
| DASH-12 | Sidebar collapses/expands | manual-only | — (DOM interaction) | ❌ |
| DASH-13 | Dark mode applied by default | smoke | Check `<html class="dark">` in build output | ❌ |
| DASH-14 | Design tokens consistent with existing pattern | manual-only | — (visual review) | ❌ |

**Sampling Rate:**
- Per task commit: `pnpm --filter @uploadkit/dashboard build` (TypeScript + Next.js compile check)
- Per wave merge: Full build + manual smoke test of rendered pages
- Phase gate: All pages load without JS errors, all interactive features work manually

### Wave 0 Gaps
- [ ] `apps/dashboard/vitest.config.ts` — unit test setup for utility functions (formatBytes, maskApiKey, usage calculations)
- [ ] `apps/dashboard/src/lib/__tests__/format.test.ts` — covers DASH-05 (masking), DASH-08 (usage pct)
- [ ] Framework install: `pnpm add -D vitest @vitejs/plugin-react --filter @uploadkit/dashboard`

**Note:** The majority of Phase 6 is UI/interaction-heavy. Automated testing focuses on utility functions (high value, low cost). UI interaction tests (sidebar toggle, command palette, bulk select) are marked manual-only — they require browser automation that's out of scope for Phase 6.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Auth.js v5 session guard in layout.tsx — already implemented Phase 2 |
| V3 Session Management | yes | 30-day session via Auth.js database strategy — established Phase 2 |
| V4 Access Control | yes | Project scoping: every DB query includes `userId: session.user.id` — must verify all new server components and internal routes do this |
| V5 Input Validation | yes | Project name/slug creation: validate on server action. File router form: validate maxFileSize/maxFileCount inputs. |
| V6 Cryptography | no | No new crypto in Phase 6. API key masking is display-only. |

### Known Threat Patterns for Dashboard

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Insecure Direct Object Reference (IDOR) — user accesses another user's project by guessing slug | Elevation of Privilege | All server components and internal routes must filter by `userId: session.user.id`. Never trust slug alone. |
| XSS via file name display | Tampering | React auto-escapes all JSX text — safe as long as no `dangerouslySetInnerHTML` is used with file names |
| CSRF on server actions | Tampering | Next.js server actions include built-in CSRF protection — established Phase 2 (T-02-11) |
| Sensitive API key exposure in client bundle | Information Disclosure | API keys shown in UI come from DB queries in server components. Client components receive masked strings only. Full key never in client-side state. |
| Bulk delete without ownership check | Elevation of Privilege | Bulk delete must verify each file's `projectId` belongs to the authenticated user's project before deletion |

---

## Sources

### Primary (HIGH confidence)
- npm registry (verified via `npm view`) — all package versions confirmed
- Existing codebase: `apps/dashboard/src/`, `packages/ui/`, `packages/shared/src/constants.ts`, `apps/api/src/app/api/v1/` — response shapes, auth patterns, DB models all read directly
- `UPLOADKIT-GSD.md` §4.1-4.2 — canonical page routes and design spec
- `06-CONTEXT.md` — locked decisions D-01 through D-11

### Secondary (MEDIUM confidence)
- TanStack Table v8 documentation patterns — `manualPagination`, `getRowId` API [ASSUMED based on training knowledge of v8 API, matches npm view 8.21.3]
- next-themes integration pattern with Next.js 15 App Router [ASSUMED — standard pattern, consistent with existing `className="dark"` on `<html>`]

### Tertiary (LOW confidence)
- None — all critical claims are verified against codebase or npm registry

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via npm registry
- Architecture: HIGH — patterns derived directly from existing codebase (auth.ts, layout.tsx, API routes)
- Pitfalls: HIGH for P1/P3/P7 (direct codebase evidence), MEDIUM for P2/P4/P5/P6 (common Next.js/Recharts/cmdk issues)
- Data shapes: HIGH — API response shapes read directly from route.ts files

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (30 days — stable libraries, slow-moving stack)
