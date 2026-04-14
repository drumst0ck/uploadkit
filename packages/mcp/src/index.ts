// UploadKit MCP server — stdio transport.
// Runs via `npx @uploadkitdev/mcp` or locally.
// All tool/resource logic lives in @uploadkitdev/mcp-core.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  registerTools,
  registerResources,
  SERVER_INFO,
  SERVER_CAPABILITIES,
} from '@uploadkitdev/mcp-core';

async function main() {
  const server = new Server(SERVER_INFO, SERVER_CAPABILITIES);
  registerTools(server);
  registerResources(server);
  await server.connect(new StdioServerTransport());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
