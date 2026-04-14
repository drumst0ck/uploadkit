# Phase 11: MCP Remote Server - Research

**Researched:** 2026-04-14
**Domain:** MCP Streamable HTTP transport, Next.js App Router route handlers, internal workspace package extraction
**Confidence:** HIGH

## Summary

The phase is unusually low-risk because the `@modelcontextprotocol/sdk` version already installed in `packages/mcp` (**1.29.0**, verified via `npm view`) ships a **`WebStandardStreamableHTTPServerTransport`** whose `handleRequest(Request): Promise<Response>` signature is a drop-in fit for a Next.js App Router `route.ts` handler. There is no need to write a custom Node `http` adapter, no `ReadableStream` glue, and no framework bridge — just instantiate the transport per request, `server.connect(transport)`, and `return transport.handleRequest(req)`.

The second non-trivial chunk is the refactor: extracting `catalog.ts`, `scaffolds.ts`, `docs.ts`, the `docs-index.json` (352 KB), the docs builder script, and a new `registerTools(server)` / `registerResources(server)` helper into a private `@uploadkitdev/mcp-core` workspace package. The monorepo already has an established pattern for this (`@uploadkitdev/shared` = private + tsup + dual ESM/CJS exports), so we follow it verbatim. `turbo.json` has `"dependsOn": ["^build"]` already, so build order will be correct with zero config.

The `apps/api` CORS middleware is permissive (`*`) and matches `/api/:path*`, but the MCP endpoint will live at `/api/v1/mcp` (not `/v1/mcp` — that's the external path; Next.js App Router requires `src/app/api/v1/mcp/route.ts`). The existing middleware already handles OPTIONS and adds wildcard CORS — we only need to add `Mcp-Session-Id` to the allow-headers list.

**Primary recommendation:** Use `WebStandardStreamableHTTPServerTransport` in **stateless mode** (no `sessionIdGenerator`) for v1. Every tool is read-only and idempotent, so stateful sessions add complexity with no payoff. Ship the endpoint under `apps/api/src/app/api/v1/mcp/route.ts`, reuse the existing middleware with a one-line header patch, defer the `mcp.uploadkit.dev` CNAME to a post-launch follow-up.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Architecture**
- Endpoint lives in `apps/api` (no new service). Reuses existing Mongo/Redis/Sentry/deploy wiring. Zero changes to `docker-compose.prod.yml`.
- Shared package `packages/mcp-core` holds catalog, scaffolds, docs index + builder, `registerTools(server)`, `registerResources(server)`. Consumed by `packages/mcp` (stdio) AND `apps/api` (HTTP).
- Transport: **Streamable HTTP** (2025 spec). SSE legacy endpoint NOT required for v1.
- Route: `POST /v1/mcp` on api service.

**Auth / Security**
- No auth for v1 — tools are public/read-only, mirror stdio server exactly.
- CORS wildcard `*` acceptable (read-only, no cookies/session). Add code comment explaining why.
- No MCP-specific rate limiting.

**Code sharing**
- `mcp-core` exposes: `CATALOG`, `installCommand`, `routeHandlerFile`, `providerSnippet`, `byosConfig`, `QUICKSTART`, `searchDocs`, `getDoc`, `listDocs`, `docsCount`, `docsGeneratedAt`, `registerTools(server)`, `registerResources(server)`.
- `build-docs-index.mjs` moves to `packages/mcp-core/scripts/`.
- Zero duplicated catalog/scaffold/search logic across repo.

**Deployment**
- Subdomain `mcp.uploadkit.dev` is nice-to-have; recommended via reverse proxy to `api.uploadkit.dev/v1/mcp`. If non-trivial, ship on `api.uploadkit.dev/v1/mcp` and add CNAME later.

**Observability**
- Log each `tools/call` with tool name at info level. No request/response body logging.
- Sentry auto-captures errors via existing api integration.

**Docs**
- Add "Remote MCP" subsection to `apps/docs/content/docs/guides/mcp.mdx` with connection URL, ChatGPT steps, Claude.ai steps, Smithery URL.
- Keep stdio as recommended path for IDEs.

**Versioning**
- Bump `@uploadkitdev/mcp` patch/minor after refactor. HTTP endpoint version tracks api service (no separate npm release).
- `@uploadkitdev/mcp-core` is **private** (`"private": true`), not published.

### Claude's Discretion

- Exact HTTP handler framework: use idiomatic apps/api choice (confirmed: Next.js App Router route handler).
- Streamable HTTP transport integration: prefer official SDK class if it exists (confirmed: `WebStandardStreamableHTTPServerTransport` exists).
- Whether to use `node:http.createServer` or plug into existing framework lifecycle (use Next.js Route Handler).
- File layout inside `apps/api/src/mcp/` (planner chooses).

### Deferred Ideas (OUT OF SCOPE)

- Authenticated premium tools (`list_my_files`, `get_usage_stats`, `create_api_key`).
- Per-user subdomain (`mcp.uploadkit.dev/u/{userId}`).
- MCP-specific rate limiting.
- SSE legacy transport (`GET /v1/mcp`).
- Structured telemetry / tool usage analytics.
- WebSocket transport.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SC-1 | `POST /v1/mcp` responds to Streamable HTTP `initialize` handshake with correct `serverInfo` matching Inspector | `WebStandardStreamableHTTPServerTransport.handleRequest(Request)` handles the full protocol incl. initialize — §1, §2 |
| SC-2 | All 11 tools work identically over HTTP with same args/shapes | Shared `registerTools(server)` in `mcp-core` guarantees identical surface — §3 |
| SC-3 | `packages/mcp-core` is authoritative source; no duplicated catalog/scaffold/search logic | Package extraction pattern from `@uploadkitdev/shared` — §4 |
| SC-4 | `docker compose -f docker-compose.prod.yml up` keeps same service list | Endpoint lives in existing `api` service — §2 (confirmed reading `docker-compose.prod.yml`) |
| SC-5 | MCP Inspector lists 11 tools, `list_components` + `get_doc` succeed | Inspector testing approach — §6 |
| SC-6 | CORS allows `chat.openai.com`, `claude.ai`, `smithery.ai` (or `*`) | Existing middleware already `*`; add `Mcp-Session-Id` header — §5 |
| SC-7 | `guides/mcp.mdx` has Remote MCP section | Layout plan — §8 |
| SC-8 | No auth required; future auth-gated tools in separate phase | Stateless transport, no session — §1, §2 |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@modelcontextprotocol/sdk` | **1.29.0** | Server class + `WebStandardStreamableHTTPServerTransport` + `StdioServerTransport` + request schemas | Already installed in `packages/mcp`. 1.29.0 exposes both Node-flavored (`StreamableHTTPServerTransport`) and Web-standard (`WebStandardStreamableHTTPServerTransport`) transports. Web-standard is what Next.js App Router consumes. [VERIFIED: `npm view @modelcontextprotocol/sdk version` → 1.29.0] [VERIFIED: local node_modules inspection — both `streamableHttp.d.ts` and `webStandardStreamableHttp.d.ts` present] |
| `next` | latest (16.x) | App Router route handler host | Already the framework of `apps/api` (`next.config.ts` present, `src/app/api/v1/**/route.ts` pattern throughout). [VERIFIED: `apps/api/package.json`] |
| `tsup` | latest (8.x) | Build `mcp-core` to dual ESM/CJS + .d.ts | Pattern used by every other workspace package including `@uploadkitdev/shared`. [VERIFIED: `packages/shared/tsup.config.ts`] |
| `zod` | latest | Referenced by MCP SDK request schemas | Already a dep of `packages/mcp` and `apps/api`. [VERIFIED: both package.json files] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@modelcontextprotocol/inspector` | latest | Smoke-test deployed endpoint | Run via `npx @modelcontextprotocol/inspector` pointing at deployed URL [CITED: `.planning/ROADMAP.md` SC-5; CONTEXT.md line 117] |
| `vitest` | latest | Route handler unit tests | Already used across `apps/api/__tests__/` [VERIFIED: `apps/api/package.json`] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `WebStandardStreamableHTTPServerTransport` | `StreamableHTTPServerTransport` (Node `http` flavor) | The Node-flavored one takes `IncomingMessage` / `ServerResponse`. Next.js App Router gives you `Request` / `NextRequest`, not Node streams. Using the Node one requires an adapter (`@hono/node-server`) or exposing `request.raw` which isn't safe on Vercel / serverless. **Reject.** |
| Raw implementation of JSON-RPC streaming | Official transport | Would need to re-implement session management, SSE framing, protocol version validation, DNS rebinding protection. Zero benefit. **Reject.** |
| Host MCP on its own service / port | Reuse apps/api | Explicit constraint in CONTEXT.md decisions — no new container. [LOCKED] |
| Hono / Express inside apps/api | Native Next.js Route Handler | apps/api already only uses App Router. Adding a second framework for one route is pure cost. [VERIFIED: `apps/api/src/app/api/v1/*/route.ts` pattern] |

**Installation (in `apps/api`):**
```bash
pnpm --filter @uploadkitdev/api add @uploadkitdev/mcp-core@workspace:* @modelcontextprotocol/sdk
```

**Installation (in the new `packages/mcp-core`):**
```bash
# package.json deps: @modelcontextprotocol/sdk, zod
# devDeps: @uploadkitdev/config, tsup, typescript, vitest (optional), @types/node
```

**Version verification:**
- `@modelcontextprotocol/sdk@1.29.0` [VERIFIED: `npm view @modelcontextprotocol/sdk version` → `1.29.0`]
- Package exports both `./server` (aggregated) and `./server/webStandardStreamableHttp` (specific path). The `./*` wildcard in `package.json#exports` makes subpath imports work. [VERIFIED: reading `node_modules/.pnpm/@modelcontextprotocol+sdk@1.29.0*/package.json`]

## Architecture Patterns

### Recommended Project Structure

```
packages/
├── mcp-core/                   # NEW — private workspace package
│   ├── package.json            # "private": true, dual ESM/CJS exports
│   ├── tsup.config.ts
│   ├── tsconfig.json
│   ├── scripts/
│   │   └── build-docs-index.mjs  # moved from packages/mcp/scripts
│   └── src/
│       ├── index.ts             # re-exports
│       ├── catalog.ts           # moved from packages/mcp
│       ├── scaffolds.ts         # moved from packages/mcp
│       ├── docs.ts              # moved from packages/mcp
│       ├── docs-index.json      # moved; regenerated by prebuild
│       ├── register-tools.ts    # NEW — registerTools(server)
│       └── register-resources.ts  # NEW — registerResources(server)
│
├── mcp/                         # slimmed down
│   ├── package.json             # prebuild now defers to mcp-core; depends on @uploadkitdev/mcp-core
│   └── src/
│       └── index.ts             # only: stdio wiring + registerTools(server) + registerResources(server)
│
apps/api/
└── src/
    ├── app/
    │   └── api/
    │       └── v1/
    │           └── mcp/
    │               ├── route.ts         # POST + OPTIONS handler, mounts transport
    │               └── health/
    │                   └── route.ts     # GET /v1/mcp/health — { status, version, tools }
    ├── lib/
    │   └── mcp-server.ts                # factory: createMcpServer() returns new Server + registerTools + registerResources
    └── middleware.ts                    # update Access-Control-Allow-Headers to include Mcp-Session-Id
```

### Pattern 1: Route handler mounts a fresh transport per request (stateless)

**What:** Each POST creates its own `Server` + `WebStandardStreamableHTTPServerTransport`, connects them, and calls `handleRequest(req)`. Stateless mode means no `sessionIdGenerator` — no in-memory session map to manage across serverless invocations.

**When to use:** Every request of this phase. Our tools are read-only, return within ms, and have no server-initiated notifications that need a long-lived SSE stream. Stateful mode is for apps where the server pushes events to a subscribed client — we don't do that.

**Example:**
```typescript
// Source: apps/api/src/app/api/v1/mcp/route.ts
// Based on SDK 1.29.0 WebStandardStreamableHTTPServerTransport.handleRequest(Request): Promise<Response>
// Verified: node_modules/.../@modelcontextprotocol/sdk/dist/esm/server/webStandardStreamableHttp.d.ts

export const runtime = 'nodejs'; // Mongoose-safe default (not needed here but keeps parity with siblings)
export const dynamic = 'force-dynamic'; // never statically prerender
export const maxDuration = 60; // Vercel/Next: allow long-running SSE up to 60s

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { registerTools, registerResources } from '@uploadkitdev/mcp-core';

const SERVER_INFO = { name: 'uploadkit', version: '0.3.1' } as const;
const CAPABILITIES = { capabilities: { tools: {}, resources: {} } } as const;

export async function POST(req: Request): Promise<Response> {
  const server = new Server(SERVER_INFO, CAPABILITIES);
  registerTools(server);
  registerResources(server);

  // Stateless: no sessionIdGenerator. Every request is independent.
  // Safe because all our tools are read-only and idempotent.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  return transport.handleRequest(req);
}

export function OPTIONS(): Response {
  // CORS preflight. Global middleware.ts also adds CORS headers; this
  // explicit response ensures a 204 without going through the route body.
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Mcp-Session-Id, MCP-Protocol-Version',
      'Access-Control-Max-Age': '86400',
    },
  });
}
```

**Why this works:**
- `WebStandardStreamableHTTPServerTransport.handleRequest(req: Request): Promise<Response>` is literally the Next.js Route Handler signature. No glue code.
- `server.connect(transport)` wires the transport to the JSON-RPC dispatcher. The transport's own `start()` is a no-op (per-request model). [VERIFIED: `webStandardStreamableHttp.d.ts` lines 186-187]
- Stateless mode = no DELETE handler needed, no session table, no cleanup. If `Mcp-Session-Id` is absent the transport simply doesn't generate/expect one. [VERIFIED: `webStandardStreamableHttp.d.ts` lines 157-160 comments]

### Pattern 2: Shared `registerTools(server)` in `mcp-core`

**What:** Extract the tool list + dispatch switch from `packages/mcp/src/index.ts` lines 43-347 into `packages/mcp-core/src/register-tools.ts`. Both stdio and HTTP call the same function.

```typescript
// Source: packages/mcp-core/src/register-tools.ts (new file)
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { CATALOG, type Category } from './catalog.js';
import { installCommand, routeHandlerFile, providerSnippet, byosConfig, QUICKSTART, type PackageManager } from './scaffolds.js';
import { searchDocs, getDoc, listDocs, docsCount, docsGeneratedAt } from './docs.js';

const TOOLS = [ /* ...the 11-tool array as-is from current index.ts... */ ];

export function registerTools(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const name = req.params.name;
    const args = (req.params.arguments ?? {}) as Record<string, unknown>;
    switch (name) {
      case 'list_components': { /* ... */ }
      // ... all 11 cases verbatim from current packages/mcp/src/index.ts
    }
  });
}
```

**Works because `Server` is transport-agnostic.** The `Server` class handles JSON-RPC routing. The transport only provides the wire. [VERIFIED: `packages/mcp/src/index.ts` already uses `new Server(...)` + `server.connect(StdioServerTransport)`; the SDK docs and type defs consistently treat transport as a separate concern.]

### Pattern 3: `packages/mcp-core` as a private workspace package

Clone `@uploadkitdev/shared` exactly (reference: `packages/shared/package.json`):

```jsonc
{
  "name": "@uploadkitdev/mcp-core",
  "version": "0.1.0",
  "private": true,
  "license": "MIT",
  "sideEffects": false,
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "prebuild": "node scripts/build-docs-index.mjs",
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@uploadkitdev/config": "workspace:*",
    "tsup": "latest",
    "typescript": "latest",
    "@types/node": "latest"
  }
}
```

**Key decisions:**
- `private: true` (CONTEXT.md locked).
- **Docs index bundled at build time** via tsup (same as current `packages/mcp`). `import INDEX from './docs-index.json' with { type: 'json' };` (verbatim from `packages/mcp/src/docs.ts` line 4). tsup treats the JSON import as a tree of string constants and inlines it into the bundle. Do NOT switch to `fs.readFile` at runtime — breaks in serverless cold-start contexts and complicates the stdio binary (`npx @uploadkitdev/mcp` needs no FS access).
- Next.js `transpilePackages` array in `apps/api/next.config.ts` should include `@uploadkitdev/mcp-core` alongside the existing `@uploadkitdev/ui`, `@uploadkitdev/db`, `@uploadkitdev/shared`. [VERIFIED: current `next.config.ts` content]

### Anti-Patterns to Avoid

- **Do not share a `Server` instance across requests.** The `Server` holds request-handler state and bound transport. Create a fresh `Server` + `Transport` per request. Construction is cheap (microseconds); `registerTools` is pure function calls.
- **Do not call `transport.handleRequest()` on a pre-started transport.** `server.connect(transport)` calls `transport.start()` internally. Just `await server.connect(transport)` then `return transport.handleRequest(req)`.
- **Do not enable `enableJsonResponse: true` globally.** That mode returns a single JSON body instead of SSE, which works for simple tool calls but breaks streaming progress notifications if we ever add them. Leave it off (SSE default) — SSE is what ChatGPT and Claude.ai expect. [VERIFIED: `webStandardStreamableHttp.d.ts` lines 70-74]
- **Do not hand-roll `Mcp-Session-Id` logic.** The transport sets the header, validates it on subsequent requests, and returns 404 on unknown sessions. [VERIFIED: class comment block, lines 150-160 of the `.d.ts`] In stateless mode none of that runs.
- **Do not leave `docs-index.json` duplicated in `packages/mcp`** after extraction. Delete `packages/mcp/src/docs-index.json` and `packages/mcp/scripts/build-docs-index.mjs`. `packages/mcp` becomes a ~30-line shim: import `registerTools` / `registerResources` from `mcp-core`, instantiate a `Server`, connect a `StdioServerTransport`, done.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON-RPC over HTTP with SSE framing | Custom `TransformStream` + `ReadableStream` controller | `WebStandardStreamableHTTPServerTransport.handleRequest(Request)` | SDK handles initialize handshake, protocol version negotiation, message IDs, SSE `event:` framing, DNS rebinding protection, session IDs, DELETE termination, resumability hooks. Re-implementing is ~2000 LOC of spec-compliance. |
| Session tracking for `Mcp-Session-Id` | In-memory Map | Transport's built-in session manager (or stateless mode) | The transport already validates session IDs, handles 400/404 errors, and supports optional event-store-backed resumability. |
| Converting Next.js `Request` to Node `IncomingMessage` | `@hono/node-server` adapter or manual stream piping | Use the Web-standard transport variant directly | Web-standard variant was built for exactly this case. Node variant only exists because older Node HTTP servers predate the Fetch API. [VERIFIED: `webStandardStreamableHttp.d.ts` header comment and `streamableHttp.d.ts` header comment] |
| CORS for `/api/v1/mcp` | Per-route header setting | Existing `apps/api/src/middleware.ts` | Already sets `Access-Control-Allow-Origin: *` and matches `/api/:path*`. One-line patch adds `Mcp-Session-Id` + `MCP-Protocol-Version` to the allow-headers list. [VERIFIED: `apps/api/src/middleware.ts`] |
| Health check JSON shape | From scratch | Match adjacent `apps/api` patterns (`NextResponse.json({...})`) | Every other route in `apps/api/src/app/api/v1/*/route.ts` uses this exact idiom. [VERIFIED: `usage/route.ts`, `projects/route.ts`, etc.] |

**Key insight:** SDK 1.29.0 made this phase largely "wiring". The entire HTTP transport layer is 20-30 lines of code. The bulk of the phase is the package extraction refactor, not protocol implementation.

## Common Pitfalls

### Pitfall 1: Importing the Node-flavored transport by accident

**What goes wrong:** `import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'` compiles, but its `handleRequest(req, res)` expects `IncomingMessage`/`ServerResponse`, not `Request`. TypeScript will surface this but only if strict mode catches the mismatch.

**Why it happens:** The Node-flavored class has a shorter, more obvious name. Docs written before v1.29 didn't have the Web-standard variant.

**How to avoid:** Import from `@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js`. The class name is `WebStandardStreamableHTTPServerTransport`. [VERIFIED: SDK 1.29.0 `.d.ts` inspection]

**Warning signs:** TypeScript complains about `Request` not being assignable to `IncomingMessage`, or runtime error "req.on is not a function".

### Pitfall 2: Module import for `docs-index.json` with ESM `with { type: 'json' }` assertion in a Next.js build

**What goes wrong:** The current `packages/mcp/src/docs.ts` uses `import INDEX from './docs-index.json' with { type: 'json' };` — a Node 22+ stable import attribute. Next.js Turbopack + tsup handle this fine; older toolchains don't.

**Why it happens:** Import attributes are ES2025. tsup / esbuild 0.20+ support them; Turbopack supports them.

**How to avoid:** Keep the attribute form (no downgrade). Verify `apps/api` builds with Next 16 (Turbopack default). If needed, change to `import INDEX from './docs-index.json';` which is what TypeScript + tsup bundle-inline regardless.

**Warning signs:** Build error mentioning "experimental" import attribute or "unknown import type".

### Pitfall 3: `transpilePackages` missing `@uploadkitdev/mcp-core`

**What goes wrong:** `apps/api` build fails with "Cannot find module" or "Unexpected token" when Next tries to consume the ESM `.mjs` from `mcp-core`.

**Why it happens:** Next.js does not transpile `node_modules` by default. Private workspace packages that ship raw ESM need to be declared.

**How to avoid:** Add `@uploadkitdev/mcp-core` to `transpilePackages` in `apps/api/next.config.ts`. [VERIFIED pattern: current config already transpiles `@uploadkitdev/ui`, `@uploadkitdev/db`, `@uploadkitdev/shared`.]

**Warning signs:** `apps/api` dev mode works but `next build` fails on the mcp-core import.

### Pitfall 4: Middleware strips the response body mid-stream

**What goes wrong:** `apps/api/src/middleware.ts` calls `NextResponse.next()` and adds CORS headers. If it ever started reading the body, it would buffer the SSE stream and break streaming.

**Why it happens:** Next middleware is request-scoped, not response-scoped. `NextResponse.next()` forwards without touching the body — so this is safe today.

**How to avoid:** Don't change the middleware's passthrough semantics. Only add `Mcp-Session-Id` and `MCP-Protocol-Version` to `Access-Control-Allow-Headers`. [VERIFIED: current middleware does `NextResponse.next()` + header setting only.]

**Warning signs:** Client hangs after initialize response; `curl -N` shows headers but no body.

### Pitfall 5: Turborepo build order forgotten for the docs-index prebuild

**What goes wrong:** `apps/api` builds before `mcp-core`'s `prebuild` runs, so the import targets a stale or missing `docs-index.json`.

**Why it happens:** Typical in a fresh clone with no cached build.

**How to avoid:** `turbo.json` already has `"build": { "dependsOn": ["^build"] }` which makes each package build its upstream deps first. Because `prebuild` is an npm lifecycle hook it runs automatically before `build`. No turbo.json changes needed. [VERIFIED: `turbo.json` content.]

**Warning signs:** `apps/api` builds fine locally (cached `mcp-core` artifacts) but fails in CI on clean install.

### Pitfall 6: Vercel serverless function timeout killing slow SSE responses

**What goes wrong:** Long tool calls (e.g., `search_docs` over 352 KB index) finish quickly (~20 ms) — fine. But if we ever add a streaming tool, Vercel default max duration is 10 s (Hobby) / 60 s (Pro/Enterprise).

**Why it happens:** Serverless function runtime limits.

**How to avoid:** Explicit `export const maxDuration = 60;` on the route. Set `export const dynamic = 'force-dynamic';` to prevent static optimization. Set `export const runtime = 'nodejs';` (default but explicit = less magic). [CITED: Next.js Route Segment Config docs.]

**Warning signs:** Inspector times out on slow tool calls; logs show FUNCTION_INVOCATION_TIMEOUT.

### Pitfall 7: `Mcp-Session-Id` is case-insensitive but the CORS allow-list is not

**What goes wrong:** Browser sends `mcp-session-id` (lowercase); CORS allow-list contains `Mcp-Session-Id`. Some strict CORS implementations treat `Access-Control-Allow-Headers` as case-sensitive.

**Why it happens:** Spec says header names are case-insensitive, but `Access-Control-Allow-Headers` matching is loosely defined.

**How to avoid:** Include the canonical MCP casing `Mcp-Session-Id` **and** `mcp-session-id` is covered because browsers lowercase outgoing headers anyway. The canonical name in the spec is `Mcp-Session-Id`. Chrome/Safari implementations do case-insensitive comparison — no action needed, just use the canonical form. [CITED: MCP spec 2025-03-26 §Streamable HTTP header names]

**Warning signs:** Browser console error "Request header field Mcp-Session-Id is not allowed by Access-Control-Allow-Headers in preflight response."

## Code Examples

Verified patterns from official SDK and adjacent apps/api routes:

### POST /v1/mcp (full route)

```typescript
// apps/api/src/app/api/v1/mcp/route.ts
// Source: SDK 1.29.0 WebStandardStreamableHTTPServerTransport.handleRequest
// Source: apps/api/src/app/api/v1/usage/route.ts (runtime export pattern)

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { registerTools, registerResources } from '@uploadkitdev/mcp-core';
import * as Sentry from '@sentry/nextjs';

const SERVER_INFO = { name: 'uploadkit', version: '0.3.1' } as const;

export async function POST(req: Request): Promise<Response> {
  try {
    const server = new Server(SERVER_INFO, { capabilities: { tools: {}, resources: {} } });
    registerTools(server);
    registerResources(server);

    // CORS is permissive and stateless-safe because every tool is read-only and
    // the endpoint accepts no cookies or auth headers that could be abused via CSRF.
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode
    });

    await server.connect(transport);
    return transport.handleRequest(req);
  } catch (err) {
    Sentry.captureException(err);
    return new Response(
      JSON.stringify({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }
}

export function OPTIONS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Mcp-Session-Id, MCP-Protocol-Version',
      'Access-Control-Max-Age': '86400',
    },
  });
}
```

### GET /v1/mcp/health

```typescript
// apps/api/src/app/api/v1/mcp/health/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { docsCount } from '@uploadkitdev/mcp-core';
import pkg from '../../../../../package.json' with { type: 'json' };

export function GET() {
  return NextResponse.json({
    status: 'ok',
    version: pkg.version,
    tools: 11,
    docs: docsCount(),
  });
}
```

### Refactored stdio entry

```typescript
// packages/mcp/src/index.ts (post-refactor)
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools, registerResources } from '@uploadkitdev/mcp-core';

const server = new Server(
  { name: 'uploadkit', version: '0.3.2' }, // bump on refactor
  { capabilities: { tools: {}, resources: {} } },
);

registerTools(server);
registerResources(server);

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Smoke test via curl

```bash
# Initialize handshake — must return SSE stream with server info
curl -N -X POST https://api.uploadkit.dev/v1/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "MCP-Protocol-Version: 2025-03-26" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'

# List tools
curl -N -X POST https://api.uploadkit.dev/v1/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# Call list_components
curl -N -X POST https://api.uploadkit.dev/v1/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_components","arguments":{}}}'
```

### Inspector smoke test

```bash
npx @modelcontextprotocol/inspector
# Then in the browser UI:
#   Transport: Streamable HTTP
#   URL: https://api.uploadkit.dev/v1/mcp  (or http://localhost:3002/api/v1/mcp in dev)
# Click Connect → should list 11 tools.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SSE-only transport (separate GET /sse + POST /messages) | Streamable HTTP (single POST with SSE body) | MCP spec 2025-03-26 | New clients (Claude.ai web, ChatGPT connectors) target Streamable HTTP. SSE legacy is optional. [CITED: modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http] |
| Node `http` adapter only | Web-standard `Request`/`Response` transport added | SDK 1.16+ (Web-standard transport added) | Web-standard variant works on Vercel/Cloudflare/Deno/Bun without adapters. [VERIFIED: 1.29.0 ships both `streamableHttp.js` and `webStandardStreamableHttp.js`] |
| Stateful sessions as default | Stateless mode first-class (pass `sessionIdGenerator: undefined`) | SDK 1.x ongoing | For read-only / idempotent servers, stateless is simpler and scales to any number of nodes. |

**Deprecated/outdated:**
- Standalone SSE transport (`SSEServerTransport`) — still in SDK for back-compat but Streamable HTTP supersedes it. Skip.
- Manual `res.write('data: ...\n\n')` SSE framing — transport owns the wire now.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@modelcontextprotocol/sdk` | mcp-core + apps/api + packages/mcp | ✓ | 1.29.0 | — |
| Node.js | runtime | ✓ | >=18 (SDK engines.node), monorepo targets 20/22 | — |
| pnpm workspaces | monorepo | ✓ | already in use | — |
| tsup | mcp-core build | ✓ | 8.x | — |
| Next.js | apps/api | ✓ | 16.x | — |
| `@modelcontextprotocol/inspector` | dev smoke testing | on-demand | latest via `npx` | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (latest) — already configured in `apps/api/vitest.config.ts` |
| Config file | `apps/api/vitest.config.ts` (existing) |
| Quick run command | `pnpm --filter @uploadkitdev/api test` |
| Full suite command | `pnpm turbo run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC-1 | POST /v1/mcp responds to `initialize` with valid serverInfo | integration (Vitest, node `fetch` against route) | `pnpm --filter @uploadkitdev/api test mcp-route` | ❌ Wave 0 |
| SC-2 | Each of 11 tools returns same shape as stdio | unit (import `registerTools`, capture `CallToolRequestSchema` handler, call directly) | `pnpm --filter @uploadkitdev/mcp-core test` | ❌ Wave 0 |
| SC-3 | `packages/mcp-core` exports catalog/scaffolds/docs/register* | unit (import assertions) | `pnpm --filter @uploadkitdev/mcp-core test` | ❌ Wave 0 |
| SC-4 | Docker compose unchanged | manual verification (`docker compose config`) | `docker compose -f docker-compose.prod.yml config` | N/A |
| SC-5 | Inspector connects + lists tools + calls list_components / get_doc | manual (run Inspector in dev, confirm) | `npx @modelcontextprotocol/inspector` pointed at `http://localhost:3002/api/v1/mcp` | N/A — manual |
| SC-6 | OPTIONS /v1/mcp returns correct CORS headers | integration | `pnpm --filter @uploadkitdev/api test mcp-cors` | ❌ Wave 0 |
| SC-7 | mcp.mdx has Remote MCP section | build + grep | `pnpm --filter @uploadkitdev/docs build && grep -q "Remote MCP" ...` | N/A |
| SC-8 | No auth required; POST without any auth header succeeds | integration | Same `mcp-route` test | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter @uploadkitdev/api test` + `pnpm --filter @uploadkitdev/mcp-core test`
- **Per wave merge:** `pnpm turbo run test build lint typecheck`
- **Phase gate:** Full suite green + Inspector smoke green + deployed endpoint returns 200 on `/v1/mcp/health`

### Wave 0 Gaps

- [ ] `packages/mcp-core/vitest.config.ts` — copy from `packages/shared/vitest.config.ts` (if exists) or minimal config
- [ ] `packages/mcp-core/tests/register-tools.test.ts` — tool dispatch surface test
- [ ] `apps/api/__tests__/mcp-route.test.ts` — end-to-end handler test using `fetch` against the exported `POST`
- [ ] `apps/api/__tests__/mcp-cors.test.ts` — OPTIONS preflight assertions
- [ ] Add `@uploadkitdev/mcp-core` to `apps/api/next.config.ts#transpilePackages`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Explicitly deferred (CONTEXT.md). Read-only public tools. |
| V3 Session Management | no | Stateless mode — no sessions to manage. |
| V4 Access Control | no | All tools public. |
| V5 Input Validation | yes | JSON-RPC framing validated by SDK transport; tool arg shapes validated by `inputSchema` in each tool definition + defensive `String(args.x ?? '')` coercions in dispatch. [VERIFIED: current packages/mcp/src/index.ts pattern] |
| V6 Cryptography | no | No secrets handled. |
| V7 Error Handling | yes | Sentry via existing `@sentry/nextjs` integration. No stack traces to client — transport returns generic JSON-RPC error shape. |
| V10 Malicious Code | n/a | No user file handling in this phase. |
| V11 Business Logic | yes | Tools must not allow resource exhaustion. `search_docs` already has a `limit` param (default 8, capped implicitly by index size of 88 pages). `docs-index.json` is 352 KB — full traversal per search is fine. |
| V14 Configuration | yes | CORS wildcard documented with in-code comment. `MCP-Protocol-Version` header validated by transport (rejects unsupported versions with 400). [VERIFIED: `webStandardStreamableHttp.d.ts` lines 236-251] |

### Known Threat Patterns for Node + Next.js Route Handler + JSON-RPC over HTTP

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| DNS rebinding attack against a local MCP server | Tampering | Not relevant here (we run on api.uploadkit.dev, not localhost). Transport supports `allowedHosts`/`allowedOrigins` opt-in for self-hosted cases. Leave disabled. [VERIFIED: transport opts] |
| JSON-RPC body too large (DoS) | DoS | Next.js 16 default body limit is 1 MB for API routes. A JSON-RPC request body for these tools is < 2 KB. Keep default. |
| Reflected XSS via tool output | XSS | Tool responses are JSON-RPC wrapped in SSE `data:` frames — never rendered as HTML by clients. Consumers (Claude/ChatGPT) sanitize. No mitigation needed at server. |
| CSRF on state-changing endpoint | Tampering | No state-changing endpoints exist in v1. If added later, require API key auth — Phase 12+. |
| Regex DoS in `search_components` / `search_docs` | DoS | Current impl uses `.includes()` and `.split(/\s+/)` — no user-supplied regex. Safe. [VERIFIED: `packages/mcp/src/docs.ts`] |
| Side-channel via error messages | Info disclosure | Route's try/catch returns generic `{ error: { code: -32603, message: 'Internal error' } }`. Details go to Sentry. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ChatGPT connectors and Claude.ai web expect Streamable HTTP (not SSE legacy) as of 2026-04 | §5 CORS targets | If a client insists on legacy SSE, add a `GET /v1/mcp` endpoint backed by `SSEServerTransport` — ~10 extra LOC. |
| A2 | Vercel `maxDuration = 60` is sufficient for all 11 tools | §Common Pitfalls #6 | If a future tool needs longer, bump to 300 (Pro plan) or refactor to async. Current tools are all < 50 ms. |
| A3 | Subdomain routing (`mcp.uploadkit.dev`) ships via Cloudflare DNS or proxy layer the operator controls, not via Next.js rewrites inside apps/api | §7 | If the operator can only express routing in `next.config.ts`, we add a `rewrites()` entry. Either way is mechanical. |
| A4 | `next.config.ts` `transpilePackages` approach works for JSON import-attribute + wildcard subpath exports | §Architecture Patterns #3 | If Next strict ESM rejects the JSON attribute, fall back to `import INDEX from './docs-index.json'` (no attribute) — tsup inlines it either way. |
| A5 | The MCP SDK's `Server` class is transport-agnostic and works identically for stdio and Streamable HTTP | §Pattern 2 | [Evidence strong: existing stdio server already composes `Server + Transport`; SDK's own examples do both.] Low risk. |
| A6 | CORS wildcard is safe because no cookies/credentials and no state-changing endpoints | §5 | If future phase adds auth via cookies, must switch to reflective origin allow-list + `Vary: Origin` + `Access-Control-Allow-Credentials: true`. Deferred. |
| A7 | Server version exposed in `serverInfo` should track `@uploadkitdev/mcp` package version (0.3.x), not api service version | §Code Examples POST route | If we prefer api service version, hardcode or import from apps/api package.json. Trivial change. |

## Open Questions

1. **Should the health endpoint be `/v1/mcp/health` or `/v1/mcp` GET?**
   - What we know: MCP spec allows `GET /mcp` to open a standalone SSE stream for server-initiated notifications. CONTEXT.md says "`GET /v1/mcp` optional for SSE fallback; can be omitted in v1."
   - What's unclear: If we put health on GET `/v1/mcp`, a client doing a GET for SSE will hit our health JSON instead of a 405.
   - Recommendation: **Put health on a sibling path** `/v1/mcp/health`. Leaves GET `/v1/mcp` free to be wired to the transport later. (This is what the code examples above do.)

2. **Version string in `serverInfo`**
   - What we know: Stdio currently reports `version: '0.1.0'` (stale; package.json is `0.3.1`).
   - What's unclear: Whether planner wants to sync these or keep them separate.
   - Recommendation: Import `version` from `@uploadkitdev/mcp-core/package.json` (or a constant re-exported from it). Single source of truth, survives renames.

3. **Inspector automation in CI**
   - What we know: `@modelcontextprotocol/inspector` is a browser UI — hard to script in CI.
   - What's unclear: Whether we want a headless protocol-conformance test in CI or just a manual verification step.
   - Recommendation: CI runs Vitest route test (hits the handler with a real JSON-RPC initialize + tools/list + tools/call). Manual Inspector check on first deploy, documented in phase verification.

4. **Subdomain subject to operator decision**
   - What we know: No existing subdomain routing rules found in repo (`vercel.json` has only crons; `docker-compose.prod.yml` has no proxy). Previous mentions in `UPLOADKIT-GSD.md` are strategy/docs, not config.
   - What's unclear: Whether operator deploys via Vercel (can add rewrites) or self-hosted (needs Caddy/nginx).
   - Recommendation: Ship the endpoint at `api.uploadkit.dev/v1/mcp`. Add a follow-up task "wire `mcp.uploadkit.dev` CNAME/rewrite" that the operator owns.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — SDK version verified via `npm view` (1.29.0) and local `.d.ts` inspection. Both transport variants present. [VERIFIED]
- Architecture: **HIGH** — `WebStandardStreamableHTTPServerTransport.handleRequest(Request): Promise<Response>` confirmed by reading `.d.ts` lines 198-201. Next.js App Router + Mongoose compatibility confirmed by existing `usage/route.ts`, `projects/route.ts` patterns.
- Package extraction pattern: **HIGH** — `@uploadkitdev/shared` is a direct template; all required fields and scripts confirmed by reading its `package.json` and `tsup.config.ts`.
- CORS strategy: **HIGH** — Existing `apps/api/src/middleware.ts` already permissive `*`; one-line extension needed for MCP-specific headers.
- Pitfalls: **MEDIUM** — Most pitfalls are reasoned from the SDK type defs and Next.js behavior, not observed in CI. Flagged for validation during implementation.
- Subdomain routing: **LOW** — No existing routing config found; depends on operator's deploy target. Recommended deferral.

**Research date:** 2026-04-14
**Valid until:** 2026-07-14 (stable SDK + framework; 90 days)

## Sources

### Primary (HIGH confidence)
- Local install `node_modules/.pnpm/@modelcontextprotocol+sdk@1.29.0_zod@4.3.6/node_modules/@modelcontextprotocol/sdk/dist/esm/server/webStandardStreamableHttp.d.ts` — full class + options surface inspected.
- Local install `...@modelcontextprotocol/sdk/dist/esm/server/streamableHttp.d.ts` — Node wrapper variant confirmed, explicitly aimed at Node `http` not Fetch.
- Local install `...@modelcontextprotocol/sdk/package.json` — subpath exports verified including `./server/webStandardStreamableHttp.js`.
- `npm view @modelcontextprotocol/sdk version` → `1.29.0` [VERIFIED 2026-04-14]
- `packages/mcp/src/index.ts` — existing stdio impl; tool schemas + dispatch to extract.
- `packages/mcp/src/docs.ts`, `catalog.ts`, `scaffolds.ts` — shared logic.
- `packages/shared/package.json`, `tsup.config.ts` — private workspace package template.
- `apps/api/src/middleware.ts` — existing CORS handler.
- `apps/api/next.config.ts` — `transpilePackages` list.
- `apps/api/src/app/api/v1/usage/route.ts`, `projects/route.ts` — Next App Router idiom in this repo.
- `turbo.json` — `^build` dependency graph confirmed.
- `docker-compose.prod.yml` — confirms apps/api service is reused, no new container.

### Secondary (MEDIUM confidence)
- MCP Streamable HTTP spec: https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http [CITED]
- MCP TypeScript SDK repo: https://github.com/modelcontextprotocol/typescript-sdk [CITED]
- Next.js Route Segment Config (runtime, dynamic, maxDuration): https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config [CITED]

### Tertiary (LOW confidence)
- Assumption A1 on ChatGPT/Claude.ai client transport preferences (general public knowledge, not re-verified today).
- Assumption A3 on subdomain routing mechanism (operator-dependent).

## §8: `guides/mcp.mdx` updates (concrete plan)

**Insertion point:** After the existing `## Install` section and its Tabs block (lines 23-120 of current mcp.mdx), **before** `## Verify it's working` (line 122). Rationale: readers who skim arrive at install first, then either (a) local stdio setup completes and they hit Verify, or (b) they want a remote/managed option and see it right after install.

**Proposed new section (English, matches existing tone):**

```mdx
## Remote MCP (hosted)

For MCP clients that can't run `npx` — **ChatGPT connectors**, **Claude.ai web**, **Smithery**, and other browser-based assistants — connect to UploadKit's hosted MCP server over HTTP.

**Endpoint:**

```
https://api.uploadkit.dev/v1/mcp
```

No API key required. Same 11 tools and 3 resources as the stdio server. Read-only.

<Tabs groupId="remote-client" items={['ChatGPT', 'Claude.ai', 'Smithery', 'Inspector']}>
  <Tab value="ChatGPT">
    1. Open **ChatGPT → Settings → Connectors → Add connector**.
    2. Paste `https://api.uploadkit.dev/v1/mcp` as the server URL.
    3. Authentication: **None**.
    4. Save. The 11 UploadKit tools will appear in your conversation's tool picker.
  </Tab>

  <Tab value="Claude.ai">
    1. Go to **Settings → Integrations → Add integration → Custom**.
    2. Paste `https://api.uploadkit.dev/v1/mcp`.
    3. Authentication: **None**.
    4. Enable the connector for the conversations where you want UploadKit knowledge.
  </Tab>

  <Tab value="Smithery">
    UploadKit is listed on Smithery (link will go here once the listing is approved). Install with one click; no configuration needed.
  </Tab>

  <Tab value="Inspector">
    Verify any MCP server with the official Inspector:

    ```bash
    npx @modelcontextprotocol/inspector
    ```

    Then in the UI pick **Transport: Streamable HTTP**, URL `https://api.uploadkit.dev/v1/mcp`, and click **Connect**.
  </Tab>
</Tabs>

<Callout>
  Use the local stdio server (section above) for IDE assistants — Claude Code, Cursor, Windsurf, Zed, Continue — they run locally and don't need a round trip. Use the remote server for browser-based assistants that can't spawn local processes.
</Callout>

### What Remote MCP does NOT do

- **No account access** — the remote server exposes the same public catalog/docs as the stdio server. It doesn't know your project, API keys, or files.
- **No auth** — read-only tools mean no sign-in flow. An authenticated "premium" tool set (`list_my_files`, `get_usage_stats`, etc.) is on the roadmap for a later phase.
- **No rate limiting specific to MCP** — standard API-level protections apply. Please don't hammer.
```

**No changes required** to `apps/docs/content/docs/guides/meta.json` (it already includes `mcp`).

## Risks / Surprises to Flag

- **Subdomain question is unresolved in the repo.** No `vercel.json` rewrites, no nginx/Caddy config checked in, no mention in `docker-compose.prod.yml`. Operator owns this. Ship on `api.uploadkit.dev/v1/mcp` for v1.
- **The current stdio server reports `version: '0.1.0'` in `serverInfo`** but `package.json` is `0.3.1`. Fix as part of the refactor — both transports should import the version from a single source (package.json).
- **`transpilePackages` is critical.** Forgetting to add `@uploadkitdev/mcp-core` there will produce a Next.js build failure that looks unrelated (typically "unexpected token" on ESM from node_modules).
- **Do not regress the Official MCP Registry entry.** `packages/mcp/server.json` + `mcpName` field in `packages/mcp/package.json` exist for registry listing. Refactor must leave these alone. The remote endpoint can be advertised via a separate registry entry or as additional metadata — out of scope for v1.
- **CI auto-changeset logic** in `release.yml` triggers on `apps/docs/content/docs/**` changes. Updating `mcp.mdx` will trigger it — intended, but don't be surprised by the PR.
- **Inspector UI is browser-only.** Automate via Vitest hitting the route with `fetch`; Inspector is for manual first-light verification.
