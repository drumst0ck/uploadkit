# @uploadkitdev/mcp

## 0.5.1

### Patch Changes

- Bundle `@uploadkitdev/mcp-core` into the published dist and drop it from runtime dependencies. Previously, `npx -y @uploadkitdev/mcp` failed for end users because npm tried to resolve `@uploadkitdev/mcp-core` from the public registry, where that private workspace package does not exist. The bundled dist keeps the stdio bootstrap self-contained.

## 0.5.0

### Minor Changes

- 6acd11b: Refactor internals to consume the new private `@uploadkitdev/mcp-core` package. The stdio bin behaviour and tool surface are unchanged — same 11 tools, same schemas, same responses. Remote Streamable HTTP MCP is now available at `https://api.uploadkit.dev/api/v1/mcp` for clients that cannot run `npx` (ChatGPT connectors, Claude.ai web, Smithery).

## 0.3.1

### Patch Changes

- Declare `mcpName` in package.json to link the npm package with the Official MCP Registry listing (`io.github.drumst0ck/uploadkit`). Enables discovery via registry.modelcontextprotocol.io and downstream aggregators (PulseMCP, mcp.so).

## 0.3.0

### Minor Changes

- Index the full docs site inside the MCP server. Adds three new tools — `search_docs` (full-text search across 88+ pages), `get_doc` (fetch one page by path), and `list_docs` (enumerate all pages) — plus a `uploadkit://docs` resource. The index is generated at build time from `apps/docs/content/docs/**/*.mdx`, so every page on docs.uploadkit.dev is now accessible to Claude Code, Cursor, Windsurf, and Zed.

## 0.2.1

### Patch Changes

- Fix URLs in bundled quickstart — point dashboard links to `app.uploadkit.dev` and docs links to `docs.uploadkit.dev` to match the actual subdomain layout.

## 0.2.0

### Minor Changes

- 0aebcd6: Introduce `@uploadkitdev/mcp` — the official Model Context Protocol server for UploadKit.

  Adds first-class integration with AI coding assistants (Claude Code, Cursor, Windsurf, Zed, Continue). Once installed, the assistant can list every UploadKit component, scaffold the Next.js route handler, wire `<UploadKitProvider>` into your layout, and generate BYOS configuration for S3, R2, GCS, or Backblaze B2.

  Install with `npx -y @uploadkitdev/mcp`. Full docs at https://uploadkit.dev/docs/guides/mcp.
