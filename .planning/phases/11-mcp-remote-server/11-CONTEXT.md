# Phase 11: MCP Remote Server — Context

**Gathered:** 2026-04-14
**Status:** Ready for planning
**Source:** Direct conversation capture (no discuss-phase skill run)

<domain>
## Phase Boundary

Expose the existing MCP tool surface (currently shipped as stdio via `@uploadkitdev/mcp`) over HTTP Streamable transport so **remote MCP clients** (ChatGPT connectors, Claude.ai web, Smithery-hosted integrations, any MCP client that cannot run `npx`) can connect to UploadKit.

**In scope:**
- Extract shared MCP logic to a new internal workspace package `packages/mcp-core`.
- Refactor `packages/mcp` (stdio) to depend on `mcp-core`.
- Add a Streamable HTTP MCP endpoint in `apps/api` (existing service).
- CORS, health check, minimal logging.
- Public tools only — same 11 tools the stdio server exposes.
- Docs update (`guides/mcp.mdx`) with remote connection instructions.
- Optional: subdomain redirect `mcp.uploadkit.dev → api.uploadkit.dev/v1/mcp`.

**Explicitly out of scope:**
- Authentication / API key checking (deferred to a later phase).
- "Premium" tools that require user-specific data (`list_my_files`, `get_usage_stats`, etc.) — also deferred.
- A separate docker service or subdomain hosting — we reuse the existing `api` container.
- Hosted dashboard integration (connect-ChatGPT-to-my-account flow).
- Rate limiting (relies on existing api-level rate limiting if configured; nothing MCP-specific).

</domain>

<decisions>
## Implementation Decisions

### Architecture

- **Endpoint lives in `apps/api`** — not a new service. Reuses existing Mongo/Redis connections, Sentry, deploy wiring, GitHub Actions, and the `api` container. Zero changes to `docker-compose.prod.yml`.
- **Shared package**: `packages/mcp-core` holds the component catalog, scaffolds (route handler, provider, BYOS config for S3/R2/GCS/B2), docs index + builder, and a `registerTools(server)` helper. Both `packages/mcp` (stdio) and `apps/api` consume it.
- **Transport**: Streamable HTTP (the 2025-spec transport). SSE legacy endpoint NOT required for v1 (if a client specifically needs it we add it, but most modern clients use Streamable HTTP).
- **Route**: `POST /v1/mcp` on the api service. Mount at the existing api router. `GET /v1/mcp` optional for SSE fallback; can be omitted in v1.

### Auth / Security

- **No auth** for v1. Every tool in the stdio server is public / read-only; the HTTP version mirrors that exactly.
- CORS: wildcard `*` is acceptable because tools are read-only and no cookies/session state exists. Add a single-line comment in code explaining why wildcard is safe here.
- No rate limiting specific to MCP; rely on api-level limiting if present.

### Code sharing

- `packages/mcp-core` exposes:
  - `CATALOG: ComponentEntry[]` — the 40+ components catalog.
  - `installCommand`, `routeHandlerFile`, `providerSnippet`, `byosConfig`, `QUICKSTART` — scaffolds.
  - `searchDocs`, `getDoc`, `listDocs`, `docsCount`, `docsGeneratedAt` — docs API backed by `docs-index.json`.
  - `registerTools(server: Server)` — attaches all 11 tool handlers.
  - `registerResources(server: Server)` — attaches the `uploadkit://*` resources.
- The docs index builder script (`build-docs-index.mjs`) moves to `packages/mcp-core/scripts/`. Both `packages/mcp` and `apps/api` reference the generated JSON from `mcp-core`.
- Neither `packages/mcp` nor the api endpoint duplicate catalog entries, scaffold strings, or search logic.

### Deployment surface

- Subdomain `mcp.uploadkit.dev` is **nice-to-have** for v1 but not required. Recommended: set it up via a reverse proxy rule pointing to `api.uploadkit.dev/v1/mcp`, so the public URL reads `https://mcp.uploadkit.dev`. If proxy setup is non-trivial, ship on `api.uploadkit.dev/v1/mcp` and add the CNAME later.

### Observability

- Log each MCP `tools/call` with the tool name at info level. No request/response body logging (could contain long code snippets).
- Sentry auto-captures errors via the existing api integration.

### Docs

- Add a "Remote MCP" subsection to `apps/docs/content/docs/guides/mcp.mdx` with:
  - Connection URL.
  - ChatGPT connector setup.
  - Claude.ai web setup (when available).
  - Smithery listing URL (post-submission).
- Keep stdio as the recommended path for IDE usage (Claude Code, Cursor, Windsurf, Zed, Continue).

### Versioning

- Bump `@uploadkitdev/mcp` patch (or minor) once the refactor to depend on `mcp-core` lands. Version of the remote endpoint tracks api service version (no separate npm release for the HTTP server).
- `packages/mcp-core` stays **private / internal** (`"private": true` in package.json) — not published to npm. Only consumed within the monorepo.

### Claude's Discretion

- Exact framework for HTTP handlers in apps/api (Hono vs Next.js route handler vs something else) — use whatever is already idiomatic in that service.
- Exact Streamable HTTP transport integration library — prefer the official `@modelcontextprotocol/sdk` Streamable HTTP transport if it exists, otherwise implement the minimal wire protocol directly.
- Whether to use `node:http.createServer` for the transport adapter or plug into the existing api framework's request lifecycle — planner decides based on what fits cleanly.
- File layout inside `apps/api/src/mcp/` — planner chooses based on existing apps/api conventions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing MCP code (to refactor, not rewrite)
- `packages/mcp/src/index.ts` — current stdio server, source of truth for tool schemas and handlers to extract.
- `packages/mcp/src/catalog.ts` — 40+ component entries to move into mcp-core.
- `packages/mcp/src/scaffolds.ts` — route handler / provider / BYOS generators to move.
- `packages/mcp/src/docs.ts` — docs search/get/list backed by JSON index.
- `packages/mcp/src/docs-index.json` — 88 docs pages, 310 KB, regenerated on build.
- `packages/mcp/scripts/build-docs-index.mjs` — generator script run in prebuild.
- `packages/mcp/package.json` — mcpName link for the Official MCP Registry.
- `packages/mcp/server.json` — registry metadata.
- `packages/mcp/README.md` — setup docs for stdio clients.

### API service (where the endpoint lives)
- `apps/api/Dockerfile` — confirms how the service is built/run in prod.
- `apps/api/src/` — existing route layout and framework conventions to match.
- `docker-compose.yml` + `docker-compose.prod.yml` — confirms the api service already has Mongo/Redis depends_on and env wiring.

### Docs to update
- `apps/docs/content/docs/guides/mcp.mdx` — add Remote MCP section.
- `apps/docs/content/docs/guides/meta.json` — already includes `mcp`, no change needed.

### MCP protocol spec
- Streamable HTTP transport: https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http
- MCP SDK (TypeScript): https://github.com/modelcontextprotocol/typescript-sdk — look for Streamable HTTP transport class.
- Inspector (for validation): https://github.com/modelcontextprotocol/inspector

### Official registry (already published)
- Registry entry: `io.github.drumst0ck/uploadkit` — https://registry.modelcontextprotocol.io
- Registry metadata file: `packages/mcp/server.json` (may need updating to advertise the remote endpoint once it's live).

### Related ongoing work
- `marketing/producthunt/` — launch kit; unrelated to this phase but same session context.
- CI `release.yml` — has auto-changeset logic when `apps/docs/content/docs/**` changes; keep compatible when refactoring paths.

</canonical_refs>

<specifics>
## Specific Ideas

- The `registerTools(server)` function will likely be ~30 lines: define the tool list once, then `server.setRequestHandler(CallToolRequestSchema, dispatch)` where `dispatch` is a switch statement — essentially what exists today in `packages/mcp/src/index.ts` lines ~170-290.
- For the Streamable HTTP endpoint, expect the handler shape: receive a POST with JSON-RPC body, stream responses back as `text/event-stream` (SSE-formatted JSON-RPC). The MCP SDK provides `StreamableHTTPServerTransport` that handles the wire protocol; the server-side code just has to wire request/response objects into it.
- CORS: respond to `OPTIONS` with `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type, Mcp-Session-Id`. Do NOT allow `credentials: include` — this lets browsers accept wildcard origin.
- Health check: `GET /v1/mcp/health` returns `{ status: "ok", version: "x.y.z", tools: 11 }`.
- When extracting to `mcp-core`, keep the old `packages/mcp/src/*.ts` files as re-exports of the new location for one release cycle to avoid surprises for the rare dev consuming them directly — then drop the shims.

</specifics>

<deferred>
## Deferred Ideas

- **Authenticated "premium" tools** (`list_my_files`, `get_usage_stats`, `create_api_key`, etc.) — require UploadKit API key verification, MongoDB lookups, and per-tenant data; belongs in its own phase.
- **Per-user subdomain** (e.g., `mcp.uploadkit.dev/u/{userId}`) so ChatGPT users can connect to their own account — depends on auth.
- **Rate limiting** specific to MCP (e.g., N tools/call per minute per IP) — add if abuse shows up; not a launch blocker.
- **SSE legacy transport** — only if a specific client that matters refuses Streamable HTTP.
- **Structured telemetry / analytics** of tool usage (which tools get called most) — useful for product decisions but not required for launch.
- **WebSocket transport** — the MCP spec allows it but adoption is near zero; skip unless a concrete user needs it.

</deferred>

---

*Phase: 11-mcp-remote-server*
*Context captured: 2026-04-14*
