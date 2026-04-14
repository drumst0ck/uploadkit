# @uploadkitdev/mcp

[![npm version](https://img.shields.io/npm/v/@uploadkitdev/mcp)](https://www.npmjs.com/package/@uploadkitdev/mcp) [![Glama MCP score](https://glama.ai/mcp/servers/drumst0ck/uploadkit/badges/score.svg)](https://glama.ai/mcp/servers/drumst0ck/uploadkit) [![Awesome MCP Servers](https://awesome.re/mentioned-badge.svg)](https://github.com/punkpeye/awesome-mcp-servers) [![Official MCP Registry](https://img.shields.io/badge/MCP%20Registry-io.github.drumst0ck%2Fuploadkit-6366f1)](https://registry.modelcontextprotocol.io)

Model Context Protocol server for **UploadKit** — gives AI coding assistants (Claude Code, Cursor, Windsurf, Zed) first-class knowledge of the UploadKit SDK.

Your AI now knows:
- Every one of UploadKit's 40+ React components (name, category, inspiration, usage)
- How to scaffold the Next.js route handler
- How to wire `<UploadKitProvider>` into the root layout
- How to configure BYOS (Bring Your Own Storage) for S3, R2, GCS, or Backblaze B2
- Which install command to run for your package manager

No config. No API key. Runs local via `npx`.

## Remote MCP

For clients that cannot spawn `npx` (ChatGPT custom connectors, Claude.ai web, Smithery), UploadKit also exposes a Streamable HTTP endpoint:

```
https://api.uploadkit.dev/api/v1/mcp
```

Same 11-tool surface, read-only, no auth. Full setup: https://docs.uploadkit.dev/docs/guides/mcp#remote-mcp

---

## Install

Add this to your MCP client config.

### Claude Code

```json
{
  "mcpServers": {
    "uploadkit": {
      "command": "npx",
      "args": ["-y", "@uploadkitdev/mcp"]
    }
  }
}
```

…or run: `claude mcp add uploadkit -- npx -y @uploadkitdev/mcp`

### Cursor

Settings → Features → Model Context Protocol → **Add new MCP server**:

```
Name:     uploadkit
Command:  npx -y @uploadkitdev/mcp
```

### Windsurf / Zed / Continue

Follow your editor's MCP docs. Command is always `npx -y @uploadkitdev/mcp`.

---

## Tools

| Tool | What it does |
|------|--------------|
| `list_components` | List all UploadKit components, filterable by category |
| `get_component` | Full metadata + usage example for one component |
| `search_components` | Keyword search across names, descriptions, inspirations |
| `get_install_command` | Returns the right install command for your package manager |
| `scaffold_route_handler` | Generates `app/api/uploadkit/[...uploadkit]/route.ts` |
| `scaffold_provider` | Snippet to wire `<UploadKitProvider>` into `layout.tsx` |
| `get_byos_config` | Env + handler for S3 / R2 / GCS / B2 |
| `get_quickstart` | End-to-end Next.js quickstart |

## Resources

- `uploadkit://catalog` — JSON of every component
- `uploadkit://quickstart` — Next.js setup walkthrough

---

## Example prompts once installed

> "Add an Apple-style animated dropzone to this page."

> "Set up UploadKit with Cloudflare R2 BYOS mode."

> "What's the difference between `UploadProgressRadial` and `UploadProgressOrbit`?"

> "Create a route handler that accepts up to 4 images of 8MB each."

---

## License

MIT
