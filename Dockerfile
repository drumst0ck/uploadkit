# Dockerfile for the UploadKit MCP stdio server.
# Used by Glama (https://glama.ai/mcp/servers) for introspection checks.
# For normal usage, prefer `npx -y @uploadkitdev/mcp` — no container needed.
#
# The server speaks JSON-RPC over stdio per the Model Context Protocol.
# Running the image directly starts the server immediately:
#   docker run -i --rm uploadkit-mcp < test-request.json

FROM node:22-alpine

# Install the published package globally. Re-pulls @latest on every Glama rebuild,
# so the image tracks the newest release automatically.
RUN npm install -g @uploadkitdev/mcp@latest \
  && which uploadkit-mcp

# stdio transport — server reads JSON-RPC from stdin, writes responses to stdout.
# The bin entry is `uploadkit-mcp` (see packages/mcp/package.json#bin).
ENTRYPOINT ["uploadkit-mcp"]
