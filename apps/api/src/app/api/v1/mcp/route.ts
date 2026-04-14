// Remote MCP endpoint — Streamable HTTP, stateless, no auth.
// Public surface of @uploadkitdev/mcp-core exposed over HTTP for clients that
// cannot spawn an stdio process (ChatGPT connectors, Claude.ai web, Smithery).

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from '@/lib/mcp-server';

export async function POST(req: Request): Promise<Response> {
  const server = createMcpServer();
  // Stateless mode: omit sessionIdGenerator entirely (exactOptionalPropertyTypes
  // forbids explicit `undefined`; per SDK docs, a missing generator disables
  // session management exactly like `sessionIdGenerator: undefined`).
  const transport = new WebStandardStreamableHTTPServerTransport({});
  await server.connect(transport);

  // Best-effort log of tools/call invocations — fire-and-forget, non-blocking.
  tryExtractToolName(req.clone())
    .then((name) => {
      if (name) console.info('[mcp] tools/call', name);
    })
    .catch(() => {});

  return transport.handleRequest(req);
}

export function OPTIONS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Mcp-Session-Id, MCP-Protocol-Version',
      'Access-Control-Max-Age': '86400',
    },
  });
}

async function tryExtractToolName(r: Request): Promise<string | null> {
  try {
    const body = (await r.json()) as {
      method?: string;
      params?: { name?: string };
    };
    if (body?.method === 'tools/call' && typeof body.params?.name === 'string') {
      return body.params.name;
    }
  } catch {
    // ignore — request body may be consumed or non-JSON during transport parse
  }
  return null;
}
