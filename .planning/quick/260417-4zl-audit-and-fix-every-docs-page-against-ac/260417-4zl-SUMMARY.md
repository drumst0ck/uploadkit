---
quick_id: 260417-4zl
description: audit and fix every docs page against actual code
date: 2026-04-17
status: complete
---

# Quick Task 260417-4zl — Full docs audit SUMMARY

## What was done

Comprehensive line-by-line audit of every MDX page under `apps/docs/content/docs/` against the real codebase. Parallel audit agents produced a finding list; every reported discrepancy was fixed.

## Files changed

### Documentation (api-reference — fully rewritten to match code)

- `apps/docs/content/docs/api-reference/authentication.mdx` — auth header corrected to `Authorization: Bearer` (was `x-api-key`)
- `apps/docs/content/docs/api-reference/rest-api.mdx` — auth, error envelope with `type`, real rate limits (10/min general, 30/min upload), pagination default 50
- `apps/docs/content/docs/api-reference/upload.mdx` — Bearer, response wrappers `{ file: {...} }`, real error codes, 15min/1h TTL
- `apps/docs/content/docs/api-reference/files.mdx` — file object fields (name/size/type), wrappers, delete → `{ ok: true }`
- `apps/docs/content/docs/api-reference/projects.mdx` — `{ projects: [...] }`, delete response
- `apps/docs/content/docs/api-reference/webhooks.mdx` — payload shape (no `event`, `file.metadata` nested, top-level `projectId`)
- `apps/docs/content/docs/api-reference/errors.mdx` — envelope with `type`, `VALIDATION_ERROR.details`, `DUPLICATE_SLUG`, `INTERNAL_ERROR`; removed non-existent rate limit headers

### Core-concepts

- `apps/docs/content/docs/core-concepts/presigned-urls.mdx` — expiry 15 min single / 1 h multipart (was "1 hour" everywhere)
- `apps/docs/content/docs/core-concepts/security.mdx` — Bearer auth, real rate limits, real TIER_LIMITS, correct presign expiry

### Getting started

- `apps/docs/content/docs/getting-started/api-only.mdx` — Bearer in every example, corrected response shapes, error table
- `apps/docs/content/docs/getting-started/quickstart.mdx` — dashboard URL `dashboard.uploadkit.dev` → `app.uploadkit.dev`
- `apps/docs/content/docs/getting-started/react.mdx` — `useUploadKit(route)` string signature (was object with non-existent props)

### SDK — core

- `apps/docs/content/docs/sdk/core/api-reference.mdx` — `err.statusCode` (was `err.status`); VERSION `0.2.1`
- `apps/docs/content/docs/sdk/core/configuration.mdx` — dashboard URL
- `apps/docs/content/docs/sdk/core/delete.mdx` — `err.statusCode`
- `apps/docs/content/docs/sdk/core/upload.mdx` — `err.statusCode` comment

### SDK — next

- `apps/docs/content/docs/sdk/next/installation.mdx` — dashboard URL
- `apps/docs/content/docs/sdk/next/ssr-plugin.mdx` — import path `@uploadkitdev/next/ssr` (was `/server`)
- `apps/docs/content/docs/sdk/next/backend-adapters.mdx` — flat `{ router, apiKey }` config (was nested `{ config: { uploadkitApiKey } }`); correct subpath imports `/express`, `/fastify`, `/hono`

### SDK — react

- `apps/docs/content/docs/sdk/react/progress.mdx` — removed non-existent `onUploadProgress` callback; documented reactive `progress` via `useUploadKit`
- `apps/docs/content/docs/sdk/react/theming.mdx`
  - added `--uk-accent`, `--uk-beam-success`, `--uk-beam-error` to token table
  - fixed `data-uk-element` values (no `uk-` prefix — `button`, `container`, `label`, etc.)
  - fixed `data-state` values (`ready`, `idle`, `dragging`, `uploading`, `success`, `error` — was `complete`)
  - Tailwind plugin path `@uploadkitdev/react/tailwind` (was `@uploadkitdev/next/tailwind`)
  - variant list now matches actual `withUk` output
- `apps/docs/content/docs/sdk/react/upload-button.mdx` — added missing props `onBeforeUploadBegin`, `config`, `uploadProgressGranularity`, `beam`

### Guides

- `apps/docs/content/docs/guides/avatar-upload.mdx` — `useUploadKit(route)` string signature
- `apps/docs/content/docs/guides/cli.mdx` — dashboard URL
- `apps/docs/content/docs/guides/cli-existing-projects.mdx` — dashboard URL
- `apps/docs/content/docs/guides/custom-styling.mdx` — `useUploadKit(route)` string signature
- `apps/docs/content/docs/guides/multipart-upload.mdx` — `useUploadKit(route)` string signature

### Code — sync VERSION constants with package.json

- `packages/core/src/index.ts` — `VERSION = '0.2.1'` (was `'0.1.0'`)
- `packages/react/src/index.ts` — `VERSION = '0.3.0'` (was `'0.1.0'`)
- `packages/mcp-core/src/server-info.ts` — `version: '0.5.2'` (was `'0.4.0'`)

## Verification

- `pnpm --filter @uploadkitdev/docs typecheck` → passes
- `pnpm --filter @uploadkitdev/core typecheck` → passes
- `pnpm --filter @uploadkitdev/react typecheck` → passes
- `pnpm --filter @uploadkitdev/mcp-core typecheck` → passes
- All API-reference examples verified against `apps/api/src/app/api/v1/**` handlers
- All React SDK prop tables verified against `packages/react/src/components/**`
- All import paths verified against `packages/*/package.json` `exports` maps
- All `useUploadKit` call sites now use the real string-argument signature from `packages/react/src/use-upload-kit.ts`

## Remaining items flagged (not auto-fixed)

- `/upload/multipart/init` does NOT support `*/*` or `image/*` wildcards in `allowedTypes`, while `/upload/request` does. Behaviour mismatch in the server — separate bug.
- `/upload/multipart/init` hard-blocks quota exceedance for all tiers, whereas `/upload/request` soft-limits paid tiers. Separate bug.
- `app.uploadkit.dev` vs `dashboard.uploadkit.dev` — chose `app.uploadkit.dev` as canonical (matches `apps/dashboard` + existing `dashboard/*.mdx` usage).
