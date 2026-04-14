import 'server-only';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  registerTools,
  registerResources,
  SERVER_INFO,
  SERVER_CAPABILITIES,
} from '@uploadkitdev/mcp-core';

/**
 * Build a fresh MCP Server instance wired with UploadKit tools and resources.
 * Each HTTP request should construct its own Server + transport pair; state is
 * never shared across requests (stateless transport per CONTEXT.md).
 */
export function createMcpServer(): Server {
  const server = new Server(SERVER_INFO, SERVER_CAPABILITIES);
  registerTools(server);
  registerResources(server);
  return server;
}
