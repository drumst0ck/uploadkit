---
phase: 11-mcp-remote-server
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/mcp-core/package.json
  - packages/mcp-core/tsup.config.ts
  - packages/mcp-core/tsconfig.json
  - packages/mcp-core/src/index.ts
  - packages/mcp-core/src/catalog.ts
  - packages/mcp-core/src/scaffolds.ts
  - packages/mcp-core/src/docs.ts
  - packages/mcp-core/src/docs-index.json
  - packages/mcp-core/src/register-tools.ts
  - packages/mcp-core/src/register-resources.ts
  - packages/mcp-core/scripts/build-docs-index.mjs
  - packages/mcp/package.json
  - packages/mcp/src/index.ts
  - packages/mcp/src/catalog.ts
  - packages/mcp/src/scaffolds.ts
  - packages/mcp/src/docs.ts
  - packages/mcp/src/docs-index.json
  - packages/mcp/scripts/build-docs-index.mjs
  - packages/mcp/server.json
  - packages/mcp/README.md
  - apps/api/package.json
  - apps/api/next.config.ts
  - apps/api/src/middleware.ts
  - apps/api/src/lib/mcp-server.ts
  - apps/api/src/app/api/v1/mcp/route.ts
  - apps/api/src/app/api/v1/mcp/health/route.ts
  - apps/api/__tests__/mcp.test.ts
  - apps/docs/content/docs/guides/mcp.mdx
  - .changeset/mcp-remote-server.md
autonomous: true
requirements:
  - SC-1
  - SC-2
  - SC-3
  - SC-4
  - SC-5
  - SC-6
  - SC-7
  - SC-8

must_haves:
  truths:
    - "POST /api/v1/mcp returns a valid Streamable HTTP response to the MCP initialize handshake with serverInfo {name: 'uploadkit', version}"
    - "tools/list over HTTP returns the same 11 tools exposed by the stdio server"
    - "tools/call for list_components and get_doc succeed over HTTP with the same JSON shape as stdio"
    - "packages/mcp-core is the single source for CATALOG, scaffolds, docs index, registerTools, registerResources"
    - "packages/mcp (stdio) still works: `npx -y @uploadkitdev/mcp` boots and answers tools/list identically to before"
    - "docker compose -f docker-compose.prod.yml config shows the same services as before (api container hosts /api/v1/mcp)"
    - "CORS preflight on /api/v1/mcp returns 204 with Access-Control-Allow-Headers including Mcp-Session-Id and MCP-Protocol-Version"
    - "apps/docs/content/docs/guides/mcp.mdx renders a Remote MCP section with the https URL and ChatGPT/Claude.ai/Smithery instructions"
    - "No auth code path exists in /api/v1/mcp — request lands without API key lookup or Mongo call"
  artifacts:
    - path: "packages/mcp-core/package.json"
      provides: "private workspace package @uploadkitdev/mcp-core"
      contains: '"private": true'
    - path: "packages/mcp-core/src/register-tools.ts"
      provides: "registerTools(server) — attaches all 11 tool handlers"
      exports: ["registerTools"]
    - path: "packages/mcp-core/src/register-resources.ts"
      provides: "registerResources(server) — attaches uploadkit://* resources"
      exports: ["registerResources"]
    - path: "apps/api/src/app/api/v1/mcp/route.ts"
      provides: "Streamable HTTP MCP endpoint, stateless"
      exports: ["POST", "OPTIONS", "runtime", "dynamic", "maxDuration"]
    - path: "apps/api/src/app/api/v1/mcp/health/route.ts"
      provides: "GET /api/v1/mcp/health returning { status, version, tools }"
      exports: ["GET"]
    - path: "apps/api/src/lib/mcp-server.ts"
      provides: "createMcpServer() factory — new Server + registerTools + registerResources"
      exports: ["createMcpServer"]
    - path: "apps/api/__tests__/mcp.test.ts"
      provides: "Vitest coverage for initialize + tools/list + tools/call"
    - path: "apps/docs/content/docs/guides/mcp.mdx"
      provides: "Remote MCP documentation section"
      contains: "Remote MCP"
    - path: ".changeset/mcp-remote-server.md"
      provides: "minor bump for @uploadkitdev/mcp"
  key_links:
    - from: "apps/api/src/app/api/v1/mcp/route.ts"
      to: "@uploadkitdev/mcp-core"
      via: "import { registerTools, registerResources }"
      pattern: "from ['\"]@uploadkitdev/mcp-core['\"]"
    - from: "packages/mcp/src/index.ts"
      to: "@uploadkitdev/mcp-core"
      via: "import { registerTools, registerResources }"
      pattern: "from ['\"]@uploadkitdev/mcp-core['\"]"
    - from: "apps/api/next.config.ts"
      to: "@uploadkitdev/mcp-core"
      via: "transpilePackages entry"
      pattern: "@uploadkitdev/mcp-core"
    - from: "apps/api/src/middleware.ts"
      to: "MCP clients"
      via: "Access-Control-Allow-Headers includes Mcp-Session-Id"
      pattern: "Mcp-Session-Id"
---

<objective>
Ship a remote Streamable HTTP MCP server at `/api/v1/mcp` inside `apps/api`, backed by a newly extracted private workspace package `@uploadkitdev/mcp-core` that becomes the single source of truth for the component catalog, scaffolds, docs index, and tool/resource registration. Refactor `packages/mcp` (stdio) to depend on `mcp-core` with zero behavioral regression, update docs, add a changeset for a minor bump of `@uploadkitdev/mcp`.

Purpose: Let remote MCP clients (ChatGPT connectors, Claude.ai web, Smithery, any client that can't run `npx`) connect to UploadKit without installing the stdio binary, while eliminating the duplicated catalog/scaffold/docs logic that would otherwise drift between stdio and HTTP.

Output: A POST/OPTIONS handler at `apps/api/src/app/api/v1/mcp/route.ts` (public URL `https://api.uploadkit.dev/api/v1/mcp`), a GET health endpoint, extended CORS, Vitest route tests, Remote MCP docs section, and a changeset.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/11-mcp-remote-server/11-CONTEXT.md
@.planning/phases/11-mcp-remote-server/11-RESEARCH.md
@packages/mcp/src/index.ts
@packages/mcp/src/catalog.ts
@packages/mcp/src/scaffolds.ts
@packages/mcp/src/docs.ts
@packages/mcp/scripts/build-docs-index.mjs
@packages/mcp/package.json
@packages/mcp/server.json
@packages/mcp/README.md
@packages/shared/package.json
@packages/shared/tsup.config.ts
@apps/api/src/middleware.ts
@apps/api/next.config.ts
@apps/api/package.json
@apps/api/__tests__/setup.ts
@apps/docs/content/docs/guides/mcp.mdx

<interfaces>
<!-- Extracted contracts that executors need. -->

From `@modelcontextprotocol/sdk@1.29.0`:
```typescript
// server/index.js
export class Server {
  constructor(info: { name: string; version: string }, options: { capabilities: ServerCapabilities });
  connect(transport: Transport): Promise<void>;
  setRequestHandler(schema: ZodSchema, handler: (req) => Promise<unknown>): void;
}

// server/webStandardStreamableHttp.js
export class WebStandardStreamableHTTPServerTransport {
  constructor(opts: { sessionIdGenerator?: (() => string) | undefined });
  handleRequest(req: Request): Promise<Response>;
}

// server/stdio.js
export class StdioServerTransport { constructor(); }

// types.js
export const ListToolsRequestSchema: ZodSchema;
export const CallToolRequestSchema: ZodSchema;
export const ListResourcesRequestSchema: ZodSchema;
export const ReadResourceRequestSchema: ZodSchema;
```

Target surface of `@uploadkitdev/mcp-core` (new):
```typescript
export { CATALOG, type ComponentEntry, type Category } from './catalog';
export {
  installCommand, routeHandlerFile, providerSnippet, byosConfig, QUICKSTART,
  type PackageManager,
} from './scaffolds';
export {
  searchDocs, getDoc, listDocs, docsCount, docsGeneratedAt,
} from './docs';
export { registerTools } from './register-tools';
export { registerResources } from './register-resources';
export { SERVER_INFO, SERVER_CAPABILITIES } from './server-info';
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Scaffold private workspace package @uploadkitdev/mcp-core</name>
  <files>
    packages/mcp-core/package.json,
    packages/mcp-core/tsup.config.ts,
    packages/mcp-core/tsconfig.json,
    packages/mcp-core/src/index.ts
  </files>
  <action>
    Create the new package directory mirroring `packages/shared` layout exactly (the locked template per CONTEXT.md and RESEARCH.md Pattern 3).
    1. `packages/mcp-core/package.json`:
       - `"name": "@uploadkitdev/mcp-core"`, `"version": "0.1.0"`, `"private": true`, `"license": "MIT"`, `"sideEffects": false`, `"type": "module"`.
       - `main: ./dist/index.js`, `module: ./dist/index.mjs`, `types: ./dist/index.d.ts`.
       - `exports` map: `"."` → `{ types: ./dist/index.d.ts, import: ./dist/index.mjs, require: ./dist/index.js }`.
       - `files: ["dist"]`.
       - `scripts`: `prebuild: node scripts/build-docs-index.mjs`, `build: tsup`, `dev: tsup --watch`, `typecheck: tsc --noEmit`.
       - `dependencies`: `@modelcontextprotocol/sdk: latest`, `zod: latest`.
       - `devDependencies`: `@uploadkitdev/config: workspace:*`, `tsup: latest`, `typescript: latest`, `@types/node: latest`.
    2. `packages/mcp-core/tsup.config.ts`: copy `packages/shared/tsup.config.ts` verbatim (entry `src/index.ts`, format `[esm, cjs]`, dts true, clean true).
       - Add `loader: { '.json': 'json' }` is NOT required; tsup handles JSON imports natively. Verify by `pnpm --filter @uploadkitdev/mcp-core build` after later tasks.
    3. `packages/mcp-core/tsconfig.json`: `extends: "@uploadkitdev/config/typescript/base.json"` (match how `packages/mcp/tsconfig.json` does it — read it first to match exactly), `include: ["src/**/*"]`.
    4. `packages/mcp-core/src/index.ts`: empty placeholder `export {};` — Task 2 fills it.
    5. Run `pnpm install` at repo root so pnpm registers the new workspace member.
    No runtime behaviour change yet. `packages/mcp` and `apps/api` untouched.
  </action>
  <verify>
    <automated>pnpm install &amp;&amp; pnpm --filter @uploadkitdev/mcp-core typecheck</automated>
  </verify>
  <done>
    Package exists, `pnpm -w ls --filter @uploadkitdev/mcp-core` prints it, typecheck passes on empty package, nothing else in the repo has changed.
    Addresses: SC-3 (foundation).
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Move catalog, scaffolds, docs, docs-index + builder into mcp-core; add registerTools / registerResources; keep packages/mcp green via re-exports</name>
  <files>
    packages/mcp-core/src/catalog.ts,
    packages/mcp-core/src/scaffolds.ts,
    packages/mcp-core/src/docs.ts,
    packages/mcp-core/src/docs-index.json,
    packages/mcp-core/src/server-info.ts,
    packages/mcp-core/src/register-tools.ts,
    packages/mcp-core/src/register-resources.ts,
    packages/mcp-core/src/index.ts,
    packages/mcp-core/scripts/build-docs-index.mjs,
    packages/mcp/package.json,
    packages/mcp/src/index.ts,
    packages/mcp/src/catalog.ts,
    packages/mcp/src/scaffolds.ts,
    packages/mcp/src/docs.ts
  </files>
  <behavior>
    - `pnpm --filter @uploadkitdev/mcp-core build` produces dist with ESM + CJS + .d.ts, includes inlined docs-index.json data.
    - `pnpm --filter @uploadkitdev/mcp build` still succeeds and produces the same `dist/index.js` bin that `npx @uploadkitdev/mcp` expects.
    - Running `node packages/mcp/dist/index.js` starts the stdio server; piping a JSON-RPC `tools/list` yields exactly 11 tools with the same names as before.
    - No catalog entries, scaffold strings, or docs search helpers remain defined (vs re-exported) anywhere outside `packages/mcp-core/src/`.
  </behavior>
  <action>
    This is the extraction. Work in this order to keep the graph green:
    1. **Move source files to mcp-core** (physical move; do NOT duplicate):
       - `git mv packages/mcp/src/catalog.ts packages/mcp-core/src/catalog.ts`
       - `git mv packages/mcp/src/scaffolds.ts packages/mcp-core/src/scaffolds.ts`
       - `git mv packages/mcp/src/docs.ts packages/mcp-core/src/docs.ts`
       - `git mv packages/mcp/src/docs-index.json packages/mcp-core/src/docs-index.json`
       - `git mv packages/mcp/scripts/build-docs-index.mjs packages/mcp-core/scripts/build-docs-index.mjs`
       - Update any relative paths inside `build-docs-index.mjs` so it still resolves `apps/docs/content/docs/**/*.mdx` from its new location (was `../../apps/docs/...`, becomes `../../../apps/docs/...`). Verify by running it in place.
       - Inside `docs.ts`, keep the `import INDEX from './docs-index.json' with { type: 'json' };` line verbatim (RESEARCH.md §Pattern 3 — tsup inlines it).
    2. **Create `packages/mcp-core/src/server-info.ts`**: export `SERVER_INFO = { name: 'uploadkit', version: PKG_VERSION }` where PKG_VERSION is statically imported from `packages/mcp/package.json` — but since mcp-core must not import its consumer, read version from `packages/mcp-core/package.json` itself via `with { type: 'json' }`. Also export `SERVER_CAPABILITIES = { capabilities: { tools: {}, resources: {} } } as const`.
    3. **Create `packages/mcp-core/src/register-tools.ts`**: lift the `TOOLS` array (11 tools) and the full `CallToolRequestSchema` switch dispatch out of the existing `packages/mcp/src/index.ts` verbatim. Export `registerTools(server: Server): void` that calls `server.setRequestHandler(ListToolsRequestSchema, ...)` and `server.setRequestHandler(CallToolRequestSchema, ...)`. Do not change tool names, arg schemas, or return shapes — SC-2 requires identical behaviour. Keep tool count at 11 exactly.
    4. **Create `packages/mcp-core/src/register-resources.ts`**: lift the `uploadkit://*` resource handlers (`ListResourcesRequestSchema`, `ReadResourceRequestSchema`) out of the existing `packages/mcp/src/index.ts` verbatim. Export `registerResources(server: Server): void`.
    5. **Fill `packages/mcp-core/src/index.ts`** with the exports from the `<interfaces>` block above.
    6. **Update `packages/mcp/package.json`**:
       - Add dependency `"@uploadkitdev/mcp-core": "workspace:*"`.
       - Remove the `prebuild` script (docs index now lives in and is generated by mcp-core).
       - Bump `version` to `0.4.0` (minor — new architecture per CONTEXT.md Versioning).
    7. **Rewrite `packages/mcp/src/index.ts`** to the minimal stdio bootstrap:
       ```ts
       #!/usr/bin/env node
       import { Server } from '@modelcontextprotocol/sdk/server/index.js';
       import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
       import { registerTools, registerResources, SERVER_INFO, SERVER_CAPABILITIES } from '@uploadkitdev/mcp-core';

       async function main() {
         const server = new Server(SERVER_INFO, SERVER_CAPABILITIES);
         registerTools(server);
         registerResources(server);
         await server.connect(new StdioServerTransport());
       }
       main().catch((e) => { console.error(e); process.exit(1); });
       ```
       Preserve the `#!/usr/bin/env node` shebang so the bin still works after `chmod +x` in the publish pipeline.
    8. **Delete the stale `packages/mcp/src/{catalog,scaffolds,docs}.ts` and `docs-index.json` and `packages/mcp/scripts/build-docs-index.mjs`** — they've been `git mv`'d in step 1, so there should be nothing left. Do NOT leave re-export shims: the only public surface of `packages/mcp` is its stdio bin, no one imports from its src (confirmed via repo grep before deletion; if any consumer exists, add a warning in the commit message).
    9. `pnpm install` to re-link workspace deps, then `pnpm --filter @uploadkitdev/mcp-core build` then `pnpm --filter @uploadkitdev/mcp build`. Both must succeed.
  </action>
  <verify>
    <automated>pnpm install &amp;&amp; pnpm --filter @uploadkitdev/mcp-core build &amp;&amp; pnpm --filter @uploadkitdev/mcp build &amp;&amp; pnpm --filter @uploadkitdev/mcp typecheck &amp;&amp; node -e "const fs=require('fs');const list=['packages/mcp/src/catalog.ts','packages/mcp/src/scaffolds.ts','packages/mcp/src/docs.ts','packages/mcp/src/docs-index.json'];for(const f of list){if(fs.existsSync(f)){console.error('still exists:',f);process.exit(1);}}console.log('dedup OK');"</automated>
  </verify>
  <done>
    Both packages build. `node packages/mcp/dist/index.js` still starts. `grep -r "CATALOG" packages/mcp/src` returns nothing defined (only imports from mcp-core). No catalog/scaffold/docs duplication.
    Addresses: SC-2, SC-3, SC-8 (same read-only tool surface preserved).
  </done>
</task>

<task type="auto">
  <name>Task 3: Wire apps/api — createMcpServer factory, POST/OPTIONS route, health route, transpilePackages, CORS headers</name>
  <files>
    apps/api/package.json,
    apps/api/next.config.ts,
    apps/api/src/middleware.ts,
    apps/api/src/lib/mcp-server.ts,
    apps/api/src/app/api/v1/mcp/route.ts,
    apps/api/src/app/api/v1/mcp/health/route.ts
  </files>
  <action>
    1. **apps/api/package.json**: add dependency `"@uploadkitdev/mcp-core": "workspace:*"`. If `@modelcontextprotocol/sdk` is not already present, add it as `"latest"`. Run `pnpm install`.
    2. **apps/api/next.config.ts**: append `'@uploadkitdev/mcp-core'` to the `transpilePackages` array (keep `@uploadkitdev/ui`, `@uploadkitdev/db`, `@uploadkitdev/shared`). This is required per RESEARCH.md §Pattern 3 — without it Next.js will complain about the raw TS sources if resolution ever bypasses the built dist.
    3. **apps/api/src/middleware.ts**: extend `Access-Control-Allow-Headers` to include `Mcp-Session-Id` and `MCP-Protocol-Version`. Final value: `'Content-Type, Authorization, x-uploadkit-version, Mcp-Session-Id, MCP-Protocol-Version'`. Keep wildcard origin with a code comment: `// Wildcard is safe here because /api/v1/mcp is read-only, no cookies/credentials (see CONTEXT.md §Auth / Security).` Do not change the matcher — `/api/:path*` already covers `/api/v1/mcp/*`.
    4. **apps/api/src/lib/mcp-server.ts**: factory module.
       ```ts
       import 'server-only';
       import { Server } from '@modelcontextprotocol/sdk/server/index.js';
       import { registerTools, registerResources, SERVER_INFO, SERVER_CAPABILITIES } from '@uploadkitdev/mcp-core';
       export function createMcpServer() {
         const server = new Server(SERVER_INFO, SERVER_CAPABILITIES);
         registerTools(server);
         registerResources(server);
         return server;
       }
       ```
    5. **apps/api/src/app/api/v1/mcp/route.ts** (the main endpoint). **Note the folder is `api/v1/mcp` under `apps/api/src/app` — Next.js App Router convention. External URL is `https://api.uploadkit.dev/api/v1/mcp` because there are no rewrites or basePath in `apps/api/next.config.ts`; the `api/v1/*` segment is the literal route prefix that siblings like `files`, `keys` also use (verified in `apps/api/src/app/api/v1/` and docs refs `files.mdx`, `rest-api.mdx`, `authentication.mdx`).**
       ```ts
       export const runtime = 'nodejs';
       export const dynamic = 'force-dynamic';
       export const maxDuration = 60;

       import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
       import { createMcpServer } from '@/lib/mcp-server';

       export async function POST(req: Request): Promise<Response> {
         const server = createMcpServer();
         const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
         await server.connect(transport);
         const toolName = tryExtractToolName(req.clone()); // fire-and-forget log, non-blocking
         toolName.then((n) => { if (n) console.info('[mcp] tools/call', n); }).catch(() => {});
         return transport.handleRequest(req);
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

       async function tryExtractToolName(r: Request): Promise<string | null> {
         try {
           const body = await r.json() as { method?: string; params?: { name?: string } };
           if (body?.method === 'tools/call' && typeof body.params?.name === 'string') return body.params.name;
         } catch {}
         return null;
       }
       ```
       Stateless mode (`sessionIdGenerator: undefined`) per RESEARCH.md §Pattern 1 — all 11 tools are read-only and idempotent.
    6. **apps/api/src/app/api/v1/mcp/health/route.ts**: use `SERVER_INFO` from `@uploadkitdev/mcp-core` (created in Task 2) — this avoids a fragile deep cross-workspace JSON import that Next.js file tracing may drop in the `output: 'standalone'` Docker build, and it guarantees the stdio server and HTTP server always report the exact same version (single source of truth).
       ```ts
       export const runtime = 'nodejs';
       export const dynamic = 'force-dynamic';
       import { NextResponse } from 'next/server';
       import { SERVER_INFO } from '@uploadkitdev/mcp-core';
       export function GET(): Response {
         return NextResponse.json({ status: 'ok', version: SERVER_INFO.version, tools: 11 });
       }
       ```
       `@uploadkitdev/mcp-core` is already in `transpilePackages` (step 2), so this survives the standalone bundler. No deep relative import, no build-time env var shim required.
    7. Build apps/api: `pnpm --filter @uploadkitdev/api build`.
  </action>
  <verify>
    <automated>pnpm --filter @uploadkitdev/api build &amp;&amp; pnpm --filter @uploadkitdev/api typecheck</automated>
  </verify>
  <done>
    apps/api builds with the new routes. `next.config.ts` transpilePackages includes mcp-core. Middleware advertises `Mcp-Session-Id` and `MCP-Protocol-Version`. Health route compiles. No new external env vars required.
    Addresses: SC-1 (endpoint exists), SC-4 (reuses api container — no new service), SC-6 (CORS headers), SC-8 (no auth path).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Vitest route test — initialize handshake + tools/list + one tools/call</name>
  <files>
    apps/api/__tests__/mcp.test.ts
  </files>
  <behavior>
    - POST `/api/v1/mcp` with a valid MCP `initialize` request body returns HTTP 200 and a JSON-RPC response whose `result.serverInfo.name === 'uploadkit'` and `result.protocolVersion` is a valid MCP spec date string.
    - POST with `method: 'tools/list'` returns a `result.tools` array whose length is exactly 11 and includes `list_components`, `get_doc`, `search_docs`.
    - POST with `method: 'tools/call'` name `list_components` (no args) returns a `result.content` array whose first entry is a text item parseable as JSON and containing at least one entry with a `slug` field matching the catalog.
    - OPTIONS returns 204 with `Access-Control-Allow-Headers` header containing BOTH `Mcp-Session-Id` AND `MCP-Protocol-Version`.
  </behavior>
  <action>
    Create `apps/api/__tests__/mcp.test.ts` following the existing vitest setup (`apps/api/__tests__/setup.ts`). Import the route handlers directly:
    ```ts
    import { describe, it, expect } from 'vitest';
    import { POST, OPTIONS } from '../src/app/api/v1/mcp/route';
    ```
    Build a helper `call(body: unknown): Promise<{ status: number; json: any }>` that constructs a `Request` with `POST`, JSON body, `Accept: application/json, text/event-stream`, `Content-Type: application/json`, `MCP-Protocol-Version: 2025-03-26`. Invoke `POST(req)`, read the response body. If the transport streams SSE, parse the last `data: {...}` line; if JSON, parse directly. Handle both shapes because `WebStandardStreamableHTTPServerTransport` picks response type based on the Accept header.
    Three test cases:
    1. `initialize` — body `{ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '0.0.0' } } }` → expect `result.serverInfo.name === 'uploadkit'` and `result.capabilities.tools` defined.
    2. `tools/list` — perform initialize first (stateless means no session needed, but the SDK may still require the sequence), then `{ jsonrpc: '2.0', id: 2, method: 'tools/list' }` → expect `result.tools.length === 11` and names include `list_components`, `get_doc`, `search_docs`, `scaffold_route_handler`.
    3. `tools/call` name `list_components` → expect `result.content[0].type === 'text'`, `JSON.parse(result.content[0].text)` is an array, first element has a `slug` string.
    4. `OPTIONS()` returns 204 and `Access-Control-Allow-Headers` contains both `Mcp-Session-Id` and `MCP-Protocol-Version` (assert both substrings).
    Do NOT hit the network. No Mongo setup required (the endpoint doesn't touch the DB).
  </action>
  <verify>
    <automated>pnpm --filter @uploadkitdev/api test -- mcp.test.ts</automated>
  </verify>
  <done>
    All four assertions pass. Test file uses no mocks of mcp-core (tests the real catalog). Test runs in &lt; 5s.
    Addresses: SC-1 (initialize handshake), SC-2 (11 tools identical), SC-5 (Inspector-equivalent proves list_components + get_doc wire — get_doc called via the same path as list_components), SC-6 (OPTIONS headers).
    Extend the test to add a fourth JSON-RPC case calling `get_doc` with `slug: 'introduction'` (or any slug present in the docs index) expecting `result.content[0].text` to be a non-empty string — this gives the plan direct coverage for SC-5's second Inspector check.
  </done>
</task>

<task type="auto">
  <name>Task 5: Docs, server.json remotes, changeset, README</name>
  <files>
    apps/docs/content/docs/guides/mcp.mdx,
    packages/mcp/README.md,
    packages/mcp/server.json,
    .changeset/mcp-remote-server.md
  </files>
  <action>
    1. **apps/docs/content/docs/guides/mcp.mdx**: add a new top-level section `## Remote MCP` after the stdio/IDE instructions. Include:
       - Connection URL: `https://api.uploadkit.dev/api/v1/mcp` (plain code block).
       - Note: "Streamable HTTP, stateless, no auth required for v1. Tools are read-only."
       - **ChatGPT connector** subsection: step-by-step (Settings → Connectors → Add custom connector → paste URL → save). Screenshot placeholder optional.
       - **Claude.ai web** subsection: brief (link to Claude.ai custom connector docs once GA; for now: "Paste the URL above as a custom MCP connector when Claude.ai exposes the UI.").
       - **Smithery / mcp.so** subsection: "Once the remote endpoint is listed on Smithery, users can install it from https://smithery.ai/server/io.github.drumst0ck/uploadkit."
       - A closing callout: "For IDE usage (Claude Code, Cursor, Windsurf, Zed, Continue), the stdio install (`npx -y @uploadkitdev/mcp`) remains the recommended path — see the section above."
    2. **packages/mcp/server.json**: if the MCP Registry schema supports a `remotes: [{ transport: 'streamable-http', url: 'https://api.uploadkit.dev/api/v1/mcp' }]` block (check the current file and the registry schema before editing), add it. If the schema doesn't support it cleanly, skip without error and leave a comment in the commit message referencing the follow-up.
    3. **packages/mcp/README.md**: add a short "Remote MCP" subsection near the top linking to the docs page, clarifying stdio vs remote.
    4. **.changeset/mcp-remote-server.md**:
       ```md
       ---
       '@uploadkitdev/mcp': minor
       ---

       Refactor internals to consume the new private `@uploadkitdev/mcp-core` package. The stdio bin behaviour and tool surface are unchanged. Remote Streamable HTTP MCP is now available at https://api.uploadkit.dev/api/v1/mcp for clients that cannot run `npx` (ChatGPT connectors, Claude.ai web, Smithery).
       ```
       This produces a clean PR from the Changesets GitHub Action. The existing auto-changeset hook in `.github/workflows/release.yml` (patch bump on docs-only changes) is independent and untouched.
    5. Deployment smoke-test (manual, post-deploy, record in the PR description — not a blocker for this plan's automated verification):
       - `curl -X OPTIONS https://api.uploadkit.dev/api/v1/mcp -i` → 204 with `Mcp-Session-Id` and `MCP-Protocol-Version` in allow-headers.
       - `curl https://api.uploadkit.dev/api/v1/mcp/health` → `{ "status": "ok", "version": "0.4.0", "tools": 11 }`.
       - `npx @modelcontextprotocol/inspector https://api.uploadkit.dev/api/v1/mcp` → tools list shows 11, `list_components` and `get_doc` succeed.
  </action>
  <verify>
    <automated>pnpm --filter @uploadkitdev/docs build &amp;&amp; node -e "const fs=require('fs');const s=fs.readFileSync('apps/docs/content/docs/guides/mcp.mdx','utf8');if(!s.includes('Remote MCP')){console.error('missing Remote MCP section');process.exit(1);}if(!s.includes('api.uploadkit.dev/api/v1/mcp')){console.error('missing URL');process.exit(1);}const c=fs.readFileSync('.changeset/mcp-remote-server.md','utf8');if(!c.includes('@uploadkitdev/mcp')||!c.includes('minor')){console.error('bad changeset');process.exit(1);}console.log('docs+changeset OK');"</automated>
  </verify>
  <done>
    Docs page renders the new section in Fumadocs build. Changeset file is valid YAML front-matter + markdown, referencing `@uploadkitdev/mcp` with a `minor` bump. README mentions remote. `server.json` either has a valid `remotes` entry or a commit-message note explaining why it was deferred.
    Addresses: SC-7 (docs section present), SC-2/SC-8 (changeset narrative documents identical tool surface + no auth).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Public internet → POST /api/v1/mcp | Any client on the internet can send arbitrary JSON-RPC bodies to the endpoint. No auth. |
| Browser origin → OPTIONS /api/v1/mcp | Browsers from arbitrary origins may preflight. Wildcard CORS is intentional (read-only, no cookies). |
| /api/v1/mcp handler → mcp-core static data | Handler only reads CATALOG and docs-index.json. No DB, no secrets, no user data. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-11-01 | Tampering | POST /api/v1/mcp JSON body | mitigate | `WebStandardStreamableHTTPServerTransport` + MCP SDK validate JSON-RPC envelopes; tool args validated by each tool's Zod schema inside `registerTools` (lifted verbatim from stdio — already production-tested). |
| T-11-02 | Information Disclosure | Log of `tools/call` tool name | accept | We log tool name only, never arguments or responses (CONTEXT.md §Observability). Tool names are public catalog identifiers. |
| T-11-03 | Denial of Service | Unauthenticated endpoint | accept (monitor) | Read-only in-memory catalog; each request is O(small). Rely on existing api-level platform rate limiting (Vercel / infra). If abuse shows up, add per-IP MCP rate limit in a follow-up phase (already listed in CONTEXT.md deferred). |
| T-11-04 | Spoofing | Origin header from browsers | accept | Wildcard CORS is intentional; no cookies, no credentials flag, no session state. A spoofed Origin gains no capability an `Access-Control-Allow-Origin: *` with `credentials: omit` does not already permit. |
| T-11-05 | Elevation of Privilege | Tool handler leaking server internals | mitigate | All 11 tools are pure functions over static catalog/docs data — no `process`, `fs`, `exec`, or env access. Static analysis of `register-tools.ts` confirms no dynamic imports or child processes. |
| T-11-06 | Repudiation | Who called tools/call? | accept | Anonymous public read-only endpoint; audit not required for v1. |
| T-11-07 | Tampering | docs-index.json bundled at build | mitigate | Generated by `scripts/build-docs-index.mjs` from checked-in MDX; tsup inlines it at build time. Runtime cannot mutate it. |
</threat_model>

<verification>
## Phase-level checks

After all 5 tasks, run in sequence:

1. **Green workspace build:** `pnpm -w build` — every package and app builds. Confirms mcp-core dist exists, mcp stdio bin still packs, apps/api compiles with new routes.
2. **Green workspace typecheck:** `pnpm -w typecheck`.
3. **Stdio regression:** `node packages/mcp/dist/index.js` responds to piped `{"jsonrpc":"2.0","id":1,"method":"tools/list"}` with 11 tools.
4. **HTTP unit test:** `pnpm --filter @uploadkitdev/api test -- mcp.test.ts` — all handshake/list/call assertions pass.
5. **Dedup proof:** `grep -RIn "export const CATALOG\|export const installCommand\|export function searchDocs" packages/mcp/src apps/api/src` returns zero matches (only in `packages/mcp-core/src`).
6. **CORS proof (unit):** middleware test or direct inspection shows `Mcp-Session-Id` and `MCP-Protocol-Version` in `Access-Control-Allow-Headers`.
7. **Docs proof:** `pnpm --filter @uploadkitdev/docs build` succeeds and the generated `/guides/mcp` page includes "Remote MCP" (grep the rendered HTML).
8. **Changeset proof:** `pnpm changeset status` lists the new changeset with `@uploadkitdev/mcp` at minor.
9. **Compose proof:** `docker compose -f docker-compose.prod.yml config --services` returns the same service list as before (api container hosts MCP; no new service).
10. **Post-deploy smoke (recorded in PR, not blocking):** Inspector against `https://api.uploadkit.dev/api/v1/mcp` → 11 tools, `list_components` + `get_doc` return content.

## Goal-backward coverage vs ROADMAP Success Criteria

| SC | Verified by |
|----|-------------|
| SC-1 initialize handshake | Task 4 test case 1 + Inspector smoke (step 10) |
| SC-2 all 11 tools identical | Task 2 (single registerTools source), Task 4 tools/list + tools/call tests |
| SC-3 single mcp-core source, no duplication | Task 2 physical file moves, verification step 5 (grep) |
| SC-4 no new container | Task 3 (endpoint in apps/api), verification step 9 (compose services unchanged) |
| SC-5 Inspector lists 11 tools, list_components + get_doc succeed | Task 4 extended test covers both calls; Inspector step 10 confirms end-to-end |
| SC-6 CORS allows chat.openai.com / claude.ai / smithery.ai (or `*`) | Task 3 middleware + OPTIONS handler; Task 4 OPTIONS assertion |
| SC-7 guides/mcp.mdx Remote MCP section | Task 5 docs edit, verification step 7 |
| SC-8 no auth; future auth-gated tools in separate phase | Task 3 (zero auth code path in route.ts), CONTEXT.md deferred section, changeset narrative |

**Coverage status:** All 8 roadmap success criteria are verified by automated tests or a specific verification step. No criterion is left unverifiable.
</verification>

<success_criteria>
- `pnpm -w build` and `pnpm -w typecheck` are green.
- `pnpm --filter @uploadkitdev/api test -- mcp.test.ts` is green and covers initialize + tools/list + tools/call (list_components + get_doc) + OPTIONS.
- `packages/mcp-core` exists as `"private": true`, is not in the Changesets publish manifest, and is listed in `apps/api/next.config.ts#transpilePackages`.
- `packages/mcp` still produces a working stdio bin; `npx -y @uploadkitdev/mcp` remains functional; its version is bumped to 0.4.0 via the changeset on release.
- No file under `packages/mcp/src` or `apps/api/src` defines CATALOG, install/scaffold strings, or docs search — they only import from `@uploadkitdev/mcp-core`.
- `apps/api/src/middleware.ts` advertises `Mcp-Session-Id` and `MCP-Protocol-Version` in the CORS allow-headers.
- `apps/docs/content/docs/guides/mcp.mdx` renders a "Remote MCP" section with `https://api.uploadkit.dev/api/v1/mcp`, ChatGPT / Claude.ai / Smithery instructions.
- `.changeset/mcp-remote-server.md` exists with a `minor` bump for `@uploadkitdev/mcp`.
- Docker compose service list is unchanged.
- Inspector smoke test against the deployed URL (recorded in PR) lists 11 tools and successfully calls `list_components` and `get_doc`.
</success_criteria>

<output>
After completion, create `.planning/phases/11-mcp-remote-server/11-01-SUMMARY.md` capturing:
- Final file layout of `packages/mcp-core` (with line counts per file).
- Before/after diff stats of `packages/mcp/src` (should be ~90% smaller).
- Curl transcripts of OPTIONS + health + a tools/list against local `pnpm --filter @uploadkitdev/api dev`.
- Inspector run transcript against the deployed URL (or a note explaining deploy is gated on ops).
- Any decisions taken on `server.json#remotes` (added vs deferred + reason).
- Follow-ups for a later phase: `mcp.uploadkit.dev` CNAME, auth-gated premium tools, MCP-specific rate limiting, SSE legacy transport.
</output>
