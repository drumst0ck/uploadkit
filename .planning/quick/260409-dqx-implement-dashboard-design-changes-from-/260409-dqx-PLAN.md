---
type: quick
tasks: 3
estimated_effort: 25min
files_modified:
  - apps/dashboard/src/app/dashboard/page.tsx
  - apps/dashboard/src/components/metric-card.tsx
  - apps/dashboard/src/components/file-browser/file-browser.tsx
  - apps/dashboard/src/components/data-table/data-table-pagination.tsx
  - apps/dashboard/src/hooks/use-files.ts
  - apps/dashboard/src/app/api/internal/projects/[slug]/files/route.ts
  - apps/dashboard/src/components/api-keys-table.tsx
---

<objective>
Implement dashboard design polish from Pencil mockup review: overview page header/trend data/links, file browser type badges and inline actions, API keys inline actions. All changes are visual/UI — no business logic modifications.
</objective>

<context>
@apps/dashboard/src/app/dashboard/page.tsx
@apps/dashboard/src/components/metric-card.tsx
@apps/dashboard/src/components/file-browser/file-browser.tsx
@apps/dashboard/src/components/data-table/data-table-pagination.tsx
@apps/dashboard/src/hooks/use-files.ts
@apps/dashboard/src/app/api/internal/projects/[slug]/files/route.ts
@apps/dashboard/src/components/api-keys-table.tsx

<interfaces>
<!-- MetricCard already supports trend prop -->
From apps/dashboard/src/components/metric-card.tsx:
```typescript
export interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: {
    value: number;   // percentage, positive or negative
    label: string;   // e.g. "from last month"
  } | undefined;
}
```

From apps/dashboard/src/hooks/use-files.ts:
```typescript
export interface UseFilesResult {
  files: FileRecord[];
  isLoading: boolean;
  error: unknown;
  nextCursor: string | null;
  hasMore: boolean;
  mutate: () => void;
}
```

From packages/db/src/models/usage-record.ts:
```typescript
export interface IUsageRecord extends Document {
  userId: Types.ObjectId;
  period: string;        // "YYYY-MM"
  storageUsed: number;
  bandwidth: number;
  uploads: number;
}
```

From apps/dashboard/src/app/api/internal/projects/[slug]/files/route.ts:
```typescript
// Current GET response shape:
{ files: FileRecord[], nextCursor: string | null, hasMore: boolean }
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Overview page — header, trends, links, status column</name>
  <files>apps/dashboard/src/app/dashboard/page.tsx</files>
  <action>
  In `apps/dashboard/src/app/dashboard/page.tsx`:

  1. **Page header**: Replace the dynamic greeting and subtitle with a static heading:
     ```tsx
     <h1 className="text-2xl font-semibold text-white">Overview</h1>
     ```
     Remove the subtitle paragraph entirely. Remove the `greeting` const.

  2. **Trend data on metric cards**: Fetch the previous month's UsageRecord to compute percentage change.
     - Compute `prevPeriod`: take `currentPeriod` ("YYYY-MM"), subtract 1 month. Handle January rollover (01 -> previous year 12). Example: `const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); const prevPeriod = prevDate.toISOString().slice(0, 7);`
     - Add to the Promise.all: `UsageRecord.findOne({ userId, period: prevPeriod }).lean()`
     - Destructure as `prevUsage` from the parallel fetch.
     - Create a helper function above the return:
       ```typescript
       function computeTrend(current: number, previous: number): { value: number; label: string } | undefined {
         if (previous === 0) return current > 0 ? { value: 100, label: 'from last month' } : undefined;
         const pct = Math.round(((current - previous) / previous) * 100);
         return { value: pct, label: 'from last month' };
       }
       ```
     - Pass `trend` prop to each MetricCard:
       - Storage Used: `trend={computeTrend(usage?.storageUsed ?? 0, prevUsage?.storageUsed ?? 0)}`
       - Bandwidth: `trend={computeTrend(usage?.bandwidth ?? 0, prevUsage?.bandwidth ?? 0)}`
       - Uploads Today: no trend (daily metric, no monthly comparison) — omit trend prop
       - Total Files: no trend (cumulative metric) — omit trend prop

  3. **Chart section "All Projects" link**: In the chart card header area, wrap the h2 and a new link in a flex container:
     ```tsx
     <div className="flex items-center justify-between mb-1">
       <h2 className="text-sm font-medium text-zinc-300">Uploads — Last 30 Days</h2>
       <Link href="/dashboard/projects" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
         All Projects
       </Link>
     </div>
     ```

  4. **Recent Files "View All" link**: In the recent files card header, wrap existing content with a flex row and add a link:
     ```tsx
     <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
       <div>
         <h2 className="text-sm font-medium text-zinc-300">Recent Files</h2>
         <p className="text-xs text-zinc-600 mt-0.5">Your 5 most recently uploaded files.</p>
       </div>
       {userProjects.length > 0 && (
         <Link
           href={`/dashboard/projects/${userProjects[0].slug}/files`}
           className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
         >
           View All →
         </Link>
       )}
     </div>
     ```

  5. **Status column in Recent Files table**: Add a "Status" TableHead after "Type". Add a TableCell after the type cell:
     ```tsx
     <TableCell>
       <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
         {file.status}
       </span>
     </TableCell>
     ```
     Note: Currently the query filters `status: 'UPLOADED'` so all will show "UPLOADED". The badge style uses emerald green matching the dark theme.
  </action>
  <verify>
    <automated>cd /Users/drumstock/Developer/GitHub/uploadkit && pnpm turbo build --filter=dashboard 2>&1 | tail -5</automated>
  </verify>
  <done>Overview page shows "Overview" heading (no greeting/subtitle), Storage and Bandwidth cards display trend percentages, chart section has "All Projects" link, recent files has "View All" link, and Status column appears in the recent files table.</done>
</task>

<task type="auto">
  <name>Task 2: File browser — type badges, inline actions, pagination format</name>
  <files>
    apps/dashboard/src/components/file-browser/file-browser.tsx
    apps/dashboard/src/components/data-table/data-table-pagination.tsx
    apps/dashboard/src/hooks/use-files.ts
    apps/dashboard/src/app/api/internal/projects/[slug]/files/route.ts
  </files>
  <action>
  **A. Colored type badges** in `file-browser.tsx`:

  Replace the mimeType column cell (Column 5, currently `<span className="text-muted-foreground text-xs">{getValue()}</span>`) with a badge component. Create a helper function inside the file:

  ```typescript
  function getTypeBadgeClasses(mime: string): string {
    if (mime.startsWith('image/')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (mime.startsWith('video/')) return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (mime.startsWith('audio/')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (mime.startsWith('application/pdf') || mime.startsWith('application/doc') || mime.startsWith('application/msword') || mime.startsWith('application/vnd.openxmlformats'))
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  }
  ```

  Update the cell render:
  ```tsx
  cell: ({ getValue }) => {
    const mime = getValue();
    // Show short label: "image/png" -> "image/png", keep full MIME for clarity
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${getTypeBadgeClasses(mime)}`}>
        {mime}
      </span>
    );
  },
  ```

  **B. Inline icon buttons replacing dropdown** in `file-browser.tsx`:

  Replace Column 7 (actions) entirely. Remove the DropdownMenu import usage for this column. Replace with inline buttons:

  ```tsx
  columnHelper.display({
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-500 hover:text-zinc-300"
          onClick={() => handleCopyUrl(row.original.url)}
          aria-label="Copy file URL"
        >
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-500 hover:text-red-400"
          onClick={() => handleDeleteSingle(row.original._id)}
          aria-label="Delete file"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
  }),
  ```

  Update imports: Add `Link2` from lucide-react (rename to avoid conflict with Next Link). Remove `MoreHorizontal` from imports. Remove `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger` from the @uploadkit/ui import (ONLY if no other usage in this file — check first; the toolbar may also use them). Keep `Button` import.

  **C. Pagination "Showing X-Y of Z" format**:

  1. In `apps/dashboard/src/app/api/internal/projects/[slug]/files/route.ts`: Add a `totalCount` to the GET response. After building the `filter` object but before the cursor condition, count total matching files:
     ```typescript
     // Count total before applying cursor for pagination display
     const totalFilter = { ...filter };
     // Remove cursor constraint from total count
     const totalCount = await File.countDocuments(totalFilter);
     ```
     Wait — the cursor filter modifies `filter` in-place via `filter._id = ...`. So compute totalCount from a filter WITHOUT the cursor. Build the base filter, clone it for total count, then add cursor:
     ```typescript
     const baseFilter = { ...filter };
     // Cursor pagination
     if (cursor && mongoose.isValidObjectId(cursor)) {
       filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
     }
     const [files, totalCount] = await Promise.all([
       File.find(filter).sort({ _id: -1 }).limit(PAGE_SIZE + 1).lean(),
       File.countDocuments(baseFilter),
     ]);
     ```
     Update the response: `return NextResponse.json({ files: resultFiles, nextCursor, hasMore, totalCount });`

  2. In `apps/dashboard/src/hooks/use-files.ts`: Add `totalCount` to the SWR response type and UseFilesResult:
     ```typescript
     export interface UseFilesResult {
       files: FileRecord[];
       isLoading: boolean;
       error: unknown;
       nextCursor: string | null;
       hasMore: boolean;
       totalCount: number;
       mutate: () => void;
     }
     ```
     Update the useSWR generic: add `totalCount: number` to the response shape.
     Return `totalCount: data?.totalCount ?? 0`.

  3. In `file-browser.tsx`: Destructure `totalCount` from `useFiles`. Pass it to DataTablePagination as a new prop.

  4. In `apps/dashboard/src/components/data-table/data-table-pagination.tsx`: Add `totalCount` prop to the interface. Add `pageNumber` (computed from cursorStack length). Update the display text:
     - Add `pageNumber?: number` and `totalCount?: number` and `pageSize?: number` to the interface (with sensible defaults).
     - If totalCount is available, compute: startIndex = `(pageNumber - 1) * pageSize + 1`, endIndex = `Math.min(pageNumber * pageSize, totalCount)`.
     - Display: `Showing {startIndex}-{endIndex} of {totalCount} files`
     - Fallback to current display if totalCount not provided.

     In file-browser.tsx, pass `pageNumber={cursorStack.length + 1}`, `totalCount={totalCount}`, `pageSize={20}` to DataTablePagination.
  </action>
  <verify>
    <automated>cd /Users/drumstock/Developer/GitHub/uploadkit && pnpm turbo build --filter=dashboard 2>&1 | tail -5</automated>
  </verify>
  <done>File browser shows colored MIME type badges (green for images, orange for docs, red for video, blue for audio, gray for other). Actions column shows inline Copy URL (Link icon) and Delete (Trash icon) buttons instead of a dropdown menu. Pagination shows "Showing 1-20 of 156 files" format.</done>
</task>

<task type="auto">
  <name>Task 3: API keys table — inline copy and revoke buttons</name>
  <files>apps/dashboard/src/components/api-keys-table.tsx</files>
  <action>
  In `apps/dashboard/src/components/api-keys-table.tsx`:

  1. Replace the DropdownMenu in the table row actions cell (last `<TableCell>`) with inline buttons. The current pattern wraps AlertDialog inside DropdownMenu which is fragile. Restructure to:

  ```tsx
  <TableCell>
    <div className="flex items-center gap-1">
      {/* Copy prefix button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-zinc-500 hover:text-zinc-300"
        onClick={() =>
          navigator.clipboard.writeText(key.keyPrefix + '...').catch(() => undefined)
        }
        aria-label="Copy key prefix"
      >
        <Copy className="h-4 w-4" />
      </Button>

      {/* Revoke button with AlertDialog confirmation */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
          >
            Revoke
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this API key?</AlertDialogTitle>
            <AlertDialogDescription>
              Any applications using this key will stop working immediately.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleRevoke(key._id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </TableCell>
  ```

  2. Remove unused imports: `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger`, `MoreHorizontal` — none of these are used elsewhere in this file.

  3. Widen the last column header slightly to accommodate inline buttons: change `className="w-[50px]"` to `className="w-[120px]"`.
  </action>
  <verify>
    <automated>cd /Users/drumstock/Developer/GitHub/uploadkit && pnpm turbo build --filter=dashboard 2>&1 | tail -5</automated>
  </verify>
  <done>API keys table shows inline Copy (icon) button and "Revoke" text button in red instead of the three-dot dropdown menu. Revoke still triggers the AlertDialog confirmation before executing. No DropdownMenu or MoreHorizontal imports remain in the file.</done>
</task>

</tasks>

<verification>
- `pnpm turbo build --filter=dashboard` completes without errors
- Overview page renders "Overview" heading, trend arrows on Storage/Bandwidth cards, "All Projects" and "View All" links, Status column in recent files
- File browser shows colored type badges, inline action icons, "Showing X-Y of Z" pagination
- API keys table shows inline copy icon + red Revoke text, AlertDialog still works
</verification>

<success_criteria>
All three visual change sets applied cleanly. Dashboard builds without TypeScript or build errors. No business logic modified — only presentation layer changes.
</success_criteria>
