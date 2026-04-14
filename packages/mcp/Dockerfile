# Dockerfile for the UploadKit MCP stdio server.
# Used by Glama (https://glama.ai/mcp/servers) to run introspection checks.
# For normal usage, prefer `npx -y @uploadkitdev/mcp` — no container needed.

FROM node:22-alpine

WORKDIR /app

# Install the published package from npm.
# Pinning happens via Glama's scheduled rebuilds — we always want the latest.
RUN npm install -g @uploadkitdev/mcp@latest

# The bin entry is `uploadkit-mcp` (see packages/mcp/package.json#bin).
# stdio transport: reads JSON-RPC from stdin, writes to stdout.
ENTRYPOINT ["uploadkit-mcp"]
