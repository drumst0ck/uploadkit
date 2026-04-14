---
'@uploadkitdev/mcp': minor
---

Refactor internals to consume the new private `@uploadkitdev/mcp-core` package. The stdio bin behaviour and tool surface are unchanged — same 11 tools, same schemas, same responses. Remote Streamable HTTP MCP is now available at `https://api.uploadkit.dev/api/v1/mcp` for clients that cannot run `npx` (ChatGPT connectors, Claude.ai web, Smithery).
