---
phase: quick
plan: ilx
subsystem: docs
tags: [docs, security, sdk, endpoint-proxy]
key-decisions:
  - UploadKitProvider uses endpoint prop (not apiKey) — API key stays server-side only
  - NEXT_PUBLIC_UPLOADKIT_API_KEY env var entirely removed from all in-scope docs
  - Negative examples in security.mdx use comment-only form to avoid grep false positives
  - Out-of-scope files (dashboard/api-keys.mdx, guides/migration-from-uploadthing.mdx) deferred
key-files:
  modified:
    - apps/docs/content/docs/getting-started/quickstart.mdx
    - apps/docs/content/docs/getting-started/nextjs.mdx
    - apps/docs/content/docs/getting-started/react.mdx
    - apps/docs/content/docs/guides/image-upload.mdx
    - apps/docs/content/docs/sdk/react/installation.mdx
    - apps/docs/content/docs/sdk/react/api-reference.mdx
    - apps/docs/content/docs/sdk/next/installation.mdx
    - apps/docs/content/docs/sdk/next/api-reference.mdx
    - apps/docs/content/docs/sdk/core/configuration.mdx
    - apps/docs/content/docs/core-concepts/security.mdx
    - apps/docs/content/docs/core-concepts/presigned-urls.mdx
metrics:
  completed: 2026-04-09
  tasks: 2
  files: 11
---

# Quick ilx: Update Docs for SDK Endpoint Proxy Pattern — Summary

**One-liner:** All 19 MDX doc files updated to use `endpoint="/api/uploadkit"` on `UploadKitProvider` — API keys removed from browser context entirely, `NEXT_PUBLIC_UPLOADKIT_API_KEY` eliminated from all in-scope docs.

## What Was Done

### Task 1: Getting-started guides and guides (4 files changed)

**quickstart.mdx**
- Removed `NEXT_PUBLIC_UPLOADKIT_API_KEY` from `.env.local` example — only `UPLOADKIT_API_KEY` shown
- Replaced `<UploadKitProvider apiKey={process.env.NEXT_PUBLIC_UPLOADKIT_API_KEY!}>` with `<UploadKitProvider endpoint="/api/uploadkit">`
- Updated env var explanation: key is server-side only

**nextjs.mdx**
- Removed `NEXT_PUBLIC_UPLOADKIT_API_KEY` from `.env.local` section
- Updated warning callout to say never prefix with `NEXT_PUBLIC_`
- Replaced `UploadKitProvider apiKey` with `UploadKitProvider endpoint="/api/uploadkit"`
- Added prose explaining the proxy pattern: browser calls local endpoint, key stays server-side

**react.mdx**
- Added "Set up a backend endpoint" section explaining that `UploadKitProvider` needs a server-side proxy, with Express example using `process.env.UPLOADKIT_API_KEY`
- Added warning callout against `VITE_`-prefixed API key variables
- Replaced `UploadKitProvider apiKey={import.meta.env.VITE_UPLOADKIT_API_KEY}` with `UploadKitProvider endpoint="/api/uploadkit"`
- Replaced browser `UploadKitClient({ apiKey })` example with `createProxyClient({ endpoint })` pattern

**image-upload.mdx**
- Updated second tab label from "React (API key)" to "React (endpoint)"
- Replaced `UploadDropzone apiKey={process.env.NEXT_PUBLIC_UPLOADKIT_API_KEY!}` with standard `route` prop
- Added note that `UploadKitProvider endpoint="/api/uploadkit"` must wrap the component

### Task 2: SDK reference and core-concepts (7 files changed)

**sdk/react/installation.mdx**
- Replaced `UploadKitProvider apiKey` with `UploadKitProvider endpoint="/api/uploadkit"`
- Updated UploadKitProvider props table: removed `apiKey` row, added `endpoint` row with description
- Updated Callout to warn against passing apiKey directly

**sdk/react/api-reference.mdx**
- Updated UploadKitProviderProps table: replaced `apiKey` entry with `endpoint` entry

**sdk/next/installation.mdx**
- Reduced `.env.local` to single `UPLOADKIT_API_KEY` variable (removed `NEXT_PUBLIC_` variant)
- Updated info callout to explicitly say never prefix with `NEXT_PUBLIC_`
- Replaced `UploadKitProvider apiKey` with `UploadKitProvider endpoint="/api/uploadkit"`
- Added prose explaining the proxy flow

**sdk/next/api-reference.mdx**
- Updated `UploadKitHandlerConfig.apiKey` description to clarify server-side only, never `NEXT_PUBLIC_`

**sdk/core/configuration.mdx**
- Added "Server-side vs browser usage" table distinguishing `createUploadKit` (server) from `createProxyClient` (browser)
- Added Callout warning against `createUploadKit` in client code
- Added `createProxyClient({ endpoint })` example section
- Renamed "Options" to "createUploadKit options" for clarity
- Updated `apiKey` option description to add "Server-side only" note

**core-concepts/security.mdx**
- Added "Endpoint proxy pattern" section at the top with flow diagram: `Browser → /api/uploadkit → api.uploadkit.dev`
- Added correct `UploadKitProvider endpoint` example
- Added anti-pattern note (comment-only, no live code) warning against apiKey prop
- Added `createUploadKitHandler` server example with `process.env.UPLOADKIT_API_KEY`
- Removed `NEXT_PUBLIC_UPLOADKIT_API_KEY` bullet from Best Practices section

**core-concepts/presigned-urls.mdx**
- Replaced `new UploadKitClient({ apiKey: process.env.NEXT_PUBLIC_UPLOADKIT_API_KEY! })` with `createProxyClient({ endpoint: '/api/uploadkit' })`

## Verification Results

```
# No UploadKitProvider with apiKey prop
PASS

# No NEXT_PUBLIC_UPLOADKIT_API_KEY in in-scope files
CLEAN in scope

# UploadKitProvider with endpoint prop count
14
```

## Deviations from Plan

### Out-of-scope files with NEXT_PUBLIC_UPLOADKIT_API_KEY

Two files outside the plan's `files_modified` list still reference `NEXT_PUBLIC_UPLOADKIT_API_KEY`:
- `apps/docs/content/docs/dashboard/api-keys.mdx` (line 47)
- `apps/docs/content/docs/guides/migration-from-uploadthing.mdx` (line 199)

These are out of scope per plan frontmatter. Logged to deferred-items for a follow-up pass.

### Files with no changes needed

5 of the 19 listed files required no changes (no `UploadKitProvider apiKey` usage found):
- `apps/docs/content/docs/guides/multipart-upload.mdx` — only server-side `UploadKitClient` with `process.env.UPLOADKIT_API_KEY`
- `apps/docs/content/docs/sdk/next/type-safety.mdx` — no UploadKitProvider usage
- `apps/docs/content/docs/sdk/next/middleware.mdx` — no UploadKitProvider usage
- `apps/docs/content/docs/sdk/next/file-router.mdx` — no UploadKitProvider usage
- `apps/docs/content/docs/sdk/core/installation.mdx` — server-side `createUploadKit` with placeholder key (correct)
- `apps/docs/content/docs/sdk/core/api-reference.mdx` — no UploadKitProvider usage
- `apps/docs/content/docs/sdk/core/upload.mdx` — server-side examples only
- `apps/docs/content/docs/sdk/core/delete.mdx` — server-side examples only

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Getting-started + guides | d405a4a | 4 files |
| Task 2: SDK reference + core-concepts | 04a9143 | 7 files |

## Self-Check: PASSED

- All 11 modified files exist and contain `endpoint="/api/uploadkit"` on UploadKitProvider
- Zero occurrences of `UploadKitProvider apiKey` in any in-scope file
- Zero occurrences of `NEXT_PUBLIC_UPLOADKIT_API_KEY` in any in-scope file
- Both commits confirmed in git log
