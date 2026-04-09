---
type: quick
id: 260409-i9f
description: "Refactor SDK — never expose API key in browser, use endpoint proxy pattern"
completed: "2026-04-09"
duration: "~10m"
tasks_completed: 3
files_modified: 5
key_decisions:
  - "ProxyUploadKitClient added alongside UploadKitClient — no breaking change for server-side consumers"
  - "exactOptionalPropertyTypes fix: pass onProgress/signal via conditional spread to #xhrPut"
  - "handler.ts restructured so validation runs once before BYOS/managed branch split"
tags: [security, sdk, proxy, api-key]
---

# Quick Task 260409-i9f: Refactor SDK — never expose API key in browser

**One-liner:** Browser-to-proxy upload flow via ProxyUploadKitClient with endpoint prop; API key stays server-side in Next.js handler.

## What Was Done

Eliminated the security anti-pattern where `UploadKitProvider` accepted an `apiKey` prop that would be passed from the browser. Implemented a full proxy pattern: React components now target a local endpoint, the Next.js handler holds the secret key and proxies to the UploadKit API server-side.

## Tasks

### Task 1 — Create ProxyUploadKitClient in @uploadkit/core

**Commit:** `524a990`
**Files:** `packages/core/src/proxy-client.ts` (new), `packages/core/src/index.ts`

- New `ProxyUploadKitClient` class with no `apiKey` field — accepts only `endpoint: string`
- Three-step upload flow: request presigned URL → XHR PUT to R2 → confirm complete
- XHR-based upload for progress events, identical pattern to existing `single.ts`
- `createProxyClient` factory exported, types `ProxyClientConfig` and `ProxyUploadOptions` exported
- Existing `UploadKitClient` and `createUploadKit` completely untouched

### Task 2 — Refactor @uploadkit/react (no apiKey in browser)

**Commit:** `4598932`
**Files:** `packages/react/src/context.tsx`, `packages/react/src/index.ts`

- `UploadKitProvider` now accepts `endpoint` prop instead of `apiKey` + `baseUrl`
- Context creates `ProxyUploadKitClient` via `createProxyClient({ endpoint })`
- `useUploadKit` hook, `UploadButton`, `UploadDropzone` — zero call-site changes needed; `ProxyUploadOptions` shape matches existing usage
- `UploadKitConfig` re-export replaced with `ProxyClientConfig` in index.ts
- Verified: `grep -r "apiKey" packages/react/src/` returns ZERO matches

### Task 3 — Add managed-mode proxy in @uploadkit/next handler

**Commit:** `4f29fa9`
**Files:** `packages/next/src/handler.ts`, `packages/next/src/types.ts`

- `UploadKitHandlerConfig` gains optional `apiUrl` field (defaults to `https://api.uploadkit.dev`)
- `request-upload` action: BYOS branch unchanged; new managed branch proxies to UploadKit API with `Authorization: Bearer ${config.apiKey}` server-side
- `upload-complete` action: BYOS branch unchanged; new managed branch confirms via UploadKit API and calls `onUploadComplete` callback
- File validation (maxFileSize, allowedTypes) runs before both branches
- Missing config (no `apiKey`, no `storage`) returns `500 MISSING_CONFIG`
- `config.apiKey` never included in any `Response.json()` sent to the browser

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] exactOptionalPropertyTypes strict type error in proxy-client.ts**
- **Found during:** Task 1 build (DTS phase)
- **Issue:** Passing `{ onProgress, signal }` directly to `#xhrPut` failed because `onProgress: ((p: number) => void) | undefined` is not assignable to `onProgress?: (p: number) => void` under `exactOptionalPropertyTypes: true`
- **Fix:** Used conditional spread `...(onProgress !== undefined ? { onProgress } : {})` pattern — the same established pattern used throughout the codebase
- **Files modified:** `packages/core/src/proxy-client.ts`
- **Commit:** `524a990` (included in same commit)

## Verification Results

```
pnpm turbo build --filter=@uploadkit/core --filter=@uploadkit/react --filter=@uploadkit/next
→ Tasks: 4 successful, 4 total

grep -r "apiKey" packages/react/src/
→ ZERO MATCHES

grep -n "apiKey.*Response.json" packages/next/src/handler.ts
→ ZERO MATCHES

UploadKitClient exported from @uploadkit/core
→ CONFIRMED (alongside new ProxyUploadKitClient)
```

## Security Surface

| Threat ID | Status |
|-----------|--------|
| T-QK-01 | Mitigated — ProxyUploadKitClient has no apiKey field |
| T-QK-02 | Mitigated — config.apiKey only in Authorization headers, never in Response.json() |
| T-QK-03 | Mitigated — middleware + file validation runs before proxying in both modes |

## Known Stubs

None. The managed-mode proxy calls real UploadKit API endpoints (`/api/v1/upload/request`, `/api/v1/upload/complete`). The BYOS path was already fully wired.
