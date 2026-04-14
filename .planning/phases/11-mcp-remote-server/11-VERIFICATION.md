---
phase: 11-mcp-remote-server
verified: 2026-04-14T20:15:00Z
status: passed
score: 8/8 success criteria verified
re_verification:
  previous_status: none
  previous_score: n/a
---

# Phase 11: MCP Remote Server — Verification Report

**Phase Goal:** Public HTTP MCP server live at `/v1/mcp` in the `api` service, exposing the same tools as `@uploadkitdev/mcp` (stdio), with a single `mcp-core` source of truth and zero new containers.

**Verified:** 2026-04-14
**Status:** PHASE VERIFIED
**Re-verification:** No — initial verification

## Success Criteria

### SC-1: Streamable HTTP handshake — PASS

**Evidence:**
- `apps/api/src/app/api/v1/mcp/route.ts:9` imports `WebStandardStreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js`
- `apps/api/src/app/api/v1/mcp/route.ts:13,17` — each POST builds a fresh `createMcpServer()` and a stateless transport (`{}` config — omits `sessionIdGenerator`, SDK interprets as stateless)
- `apps/api/src/lib/mcp-server.ts:16` constructs `new Server(SERVER_INFO, SERVER_CAPABILITIES)` where `SERVER_INFO` comes from `@uploadkitdev/mcp-core`
- `packages/mcp-core/src/server-info.ts:7-10` — `SERVER_INFO = { name: 'uploadkit', version: '0.4.0' }`
- Vitest proof (`apps/api/__tests__/mcp.test.ts:72-78`): `initialize` returns `serverInfo.name === 'uploadkit'` and valid protocolVersion — test passes (5/5).

### SC-2: 11 tools parity — PASS

**Evidence:**
- `packages/mcp/src/index.ts:7-12` (stdio) and `apps/api/src/lib/mcp-server.ts:3-8` (HTTP) both import `registerTools` from `@uploadkitdev/mcp-core`, sharing one implementation.
- `packages/mcp-core/src/register-tools.ts` — 11 tool names declared at lines 26, 41, 56, 68, 88, 116, 122, 137, 142, 158, 174:
  `list_components, get_component, search_components, get_install_command, scaffold_route_handler, scaffold_provider, get_byos_config, get_quickstart, search_docs, get_doc, list_docs`
- Stdio regression (built bin piped `initialize` + `tools/list`) returned distinct tool-name count `11`.
- HTTP vitest (`mcp.test.ts:80-89`): `tools/list` → `expect(tools).toHaveLength(11)` and contains `list_components, get_doc, search_docs, scaffold_route_handler`. Passes.

### SC-3: Single `mcp-core` source of truth — PASS

**Evidence:**
- `grep -rln "export const CATALOG" packages/ apps/` → only match in source code: `packages/mcp-core/src/catalog.ts`. (Other matches are the PLAN and SUMMARY docs.)
- `grep -rln "export function installCommand|export function searchDocs" packages/ apps/` → only source match: `packages/mcp-core/src/scaffolds.ts` and `packages/mcp-core/src/docs.ts`.
- `packages/mcp-core/src/index.ts:1-19` re-exports `CATALOG`, `installCommand`, `routeHandlerFile`, `providerSnippet`, `byosConfig`, `QUICKSTART`, `searchDocs`, `getDoc`, `listDocs`, `registerTools`, `registerResources`, `SERVER_INFO`, `SERVER_CAPABILITIES`.
- `packages/mcp/src/index.ts` reduced to 24 lines — pure stdio bootstrap; no catalog/scaffold/docs logic remains.

### SC-4: No new container — PASS

**Evidence:**
`grep -E "^  [a-z_-]+:$" docker-compose.prod.yml | sort`:
```
api:
cron:
dashboard:
docs:
mongodb:
mongodb_data:  (volume)
redis:
redis_data:    (volume)
web:
```
Service list: `api, cron, dashboard, docs, mongodb, redis, web` — matches expected pre-phase list. No `mcp` service added. MCP endpoint lives inside the existing `api` service at `/api/v1/mcp`.

### SC-5: Inspector-compatible (via test coverage) — PASS

**Evidence:**
- `apps/api/__tests__/mcp.test.ts` covers all four protocol flows required by Inspector:
  - `initialize` handshake (lines 72-78)
  - `tools/list` (lines 80-89)
  - `tools/call list_components` (lines 91-105)
  - `tools/call get_doc` (lines 107-130) — path discovered dynamically via `list_docs`
  - `OPTIONS` preflight (lines 133-141)
- `pnpm --filter @uploadkitdev/api test mcp` → `Test Files 1 passed (1) | Tests 5 passed (5)` in 260 ms.
- Build output confirms `/api/v1/mcp` and `/api/v1/mcp/health` both compiled as dynamic routes (Next 16 dynamic indicator `ƒ`).
- Inspector over the deployed URL is a post-deploy acceptance step (documented in SUMMARY "Curl Transcripts"). Local proof is sufficient.

### SC-6: CORS headers — PASS

**Evidence:**
- `apps/api/src/middleware.ts:10-12` — global `Access-Control-Allow-Headers` includes both `Mcp-Session-Id` and `MCP-Protocol-Version`:
  `'Content-Type, Authorization, x-uploadkit-version, Mcp-Session-Id, MCP-Protocol-Version'`
- `apps/api/src/app/api/v1/mcp/route.ts:30-41` — route-level `OPTIONS` also advertises both headers in allow-headers and uses `Access-Control-Allow-Origin: *`.
- Wildcard is justified inline: "Wildcard is safe here because the public surface (SDK + /api/v1/mcp) is read-only for remote clients and carries no cookies/session state." (middleware.ts:5-7) — matches SC-6 requirement.
- Vitest `OPTIONS` test (mcp.test.ts:134-140) asserts both headers present in the response; passes.

### SC-7: Docs updated — PASS

**Evidence:** `apps/docs/content/docs/guides/mcp.mdx`
- Line 122: `## Remote MCP` section header
- Line 127: `https://api.uploadkit.dev/api/v1/mcp` URL in a code block
- Lines 132-136: **ChatGPT connector** instructions (Settings → Connectors → Add custom connector → paste URL)
- Lines 138-140: **Claude.ai web** instructions (paste URL as custom MCP connector)
- Lines 142-148: **Smithery / mcp.so** instructions with registry link

### SC-8: No authentication — PASS

**Evidence:**
- `grep -rnE "apiKey|bcrypt|withApiKey|auth\(|getSession" apps/api/src/app/api/v1/mcp/` → zero matches across both `route.ts` and `health/route.ts`.
- `apps/api/src/app/api/v1/mcp/route.ts` imports only: `WebStandardStreamableHTTPServerTransport`, `createMcpServer`. No auth helpers, no session middleware, no bcrypt compare.
- `apps/api/src/lib/mcp-server.ts` imports only `Server` from the MCP SDK and the mcp-core exports. No auth layer.
- The global `middleware.ts` performs CORS only — it does not gate access by API key (matcher: `/api/:path*`).

## Regression Checks

| Check | Result |
|-------|--------|
| `pnpm turbo build --filter @uploadkitdev/mcp-core --filter @uploadkitdev/mcp --filter @uploadkitdev/api` | 6/6 successful tasks (3 cached, 3 fresh), 8.29s |
| `/api/v1/mcp` compiled as dynamic route | PASS |
| `/api/v1/mcp/health` compiled as dynamic route | PASS |
| Stdio `packages/mcp/dist/index.js` piped `initialize`+`tools/list` → distinct tool names | 11 (expected 11) |
| `pnpm --filter @uploadkitdev/api test mcp` | 5/5 passing in 260 ms |
| Dedup grep — `CATALOG`, `installCommand`, `searchDocs` | All located only in `packages/mcp-core/src/` |
| `docker-compose.prod.yml` service list | Unchanged: api, cron, dashboard, docs, mongodb, redis, web |

No regressions detected.

## Anti-Patterns Scan

- No TODO/FIXME/PLACEHOLDER markers introduced in the new route, library, or core files.
- `server-only` stub at `apps/api/__tests__/stubs/server-only.ts` is test-only and never shipped — declared openly in SUMMARY "Known Stubs: None".
- `SERVER_INFO.version` is hardcoded `'0.4.0'` in mcp-core to avoid Next.js standalone tracing drop — documented tradeoff in `server-info.ts:1-6`. Acceptable; kept in sync via changeset.

## Human Verification Required

None required for the codebase itself. The SUMMARY lists post-deploy smoke tests against `https://api.uploadkit.dev/api/v1/mcp` (Inspector run, curl health, curl OPTIONS) which are ops-tier acceptance — outside this phase's scope and explicitly gated on deploy. All 8 success criteria are verifiable from the repository and pass.

## Final Verdict

**PHASE VERIFIED**

All 8 success criteria pass with direct evidence from the codebase, a green turbo build across the three affected workspaces, a green 5/5 vitest suite for the new route, and a stdio regression that still yields exactly 11 tools. A single `@uploadkitdev/mcp-core` workspace package is the authoritative source; `packages/mcp` and `apps/api` both depend on it; no code duplication, no new container, no auth leakage.

---

_Verified: 2026-04-14T20:15:00Z_
_Verifier: Claude (gsd-verifier)_
