import { describe, it, expect } from 'vitest';
import { POST, OPTIONS } from '../src/app/api/v1/mcp/route';

type JsonRpc = {
  jsonrpc?: string;
  id?: number | string;
  result?: any;
  error?: any;
};

/** Build a Request + invoke POST + parse JSON or SSE back into the last JSON-RPC envelope. */
async function call(body: unknown): Promise<{ status: number; json: JsonRpc | null }> {
  const req = new Request('http://localhost/api/v1/mcp', {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': '2025-03-26',
    },
    body: JSON.stringify(body),
  });
  const res = await POST(req);
  const contentType = res.headers.get('content-type') ?? '';
  const text = await res.text();

  let json: JsonRpc | null = null;
  if (contentType.includes('application/json')) {
    try {
      json = JSON.parse(text) as JsonRpc;
    } catch {
      json = null;
    }
  } else if (contentType.includes('text/event-stream')) {
    // Pick the last `data:` line that parses as JSON.
    const lines = text.split(/\r?\n/);
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (line?.startsWith('data: ')) {
        const payload = line.slice(6);
        try {
          const parsed = JSON.parse(payload);
          json = parsed as JsonRpc;
          break;
        } catch {
          continue;
        }
      }
    }
  } else {
    try {
      json = JSON.parse(text) as JsonRpc;
    } catch {
      json = null;
    }
  }

  return { status: res.status, json };
}

const initializeBody = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'vitest', version: '0.0.0' },
  },
};

describe('POST /api/v1/mcp', () => {
  it('handles initialize handshake with serverInfo.name === uploadkit', async () => {
    const { status, json } = await call(initializeBody);
    expect(status).toBe(200);
    expect(json?.result?.serverInfo?.name).toBe('uploadkit');
    expect(json?.result?.protocolVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(json?.result?.capabilities?.tools).toBeDefined();
  });

  it('lists exactly 11 tools including list_components, get_doc, search_docs, scaffold_route_handler', async () => {
    const { json } = await call({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const tools: Array<{ name: string }> = json?.result?.tools ?? [];
    expect(tools).toHaveLength(11);
    const names = tools.map((t) => t.name);
    expect(names).toContain('list_components');
    expect(names).toContain('get_doc');
    expect(names).toContain('search_docs');
    expect(names).toContain('scaffold_route_handler');
  });

  it('tools/call list_components returns a JSON-parseable catalog', async () => {
    const { json } = await call({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'list_components', arguments: {} },
    });
    const content = json?.result?.content;
    expect(Array.isArray(content)).toBe(true);
    expect(content[0]?.type).toBe('text');
    const parsed = JSON.parse(content[0].text) as { count: number; components: any[] };
    expect(Array.isArray(parsed.components)).toBe(true);
    expect(parsed.components.length).toBeGreaterThan(0);
    expect(typeof parsed.components[0].name).toBe('string');
  });

  it('tools/call get_doc returns non-empty markdown for a known path', async () => {
    // list_docs indirectly — pick a commonly present guide path.
    // First discover a real path via list_docs to avoid coupling to a slug.
    const listRes = await call({
      jsonrpc: '2.0',
      id: 10,
      method: 'tools/call',
      params: { name: 'list_docs', arguments: {} },
    });
    const listContent = listRes.json?.result?.content?.[0]?.text;
    const listed = JSON.parse(listContent) as { pages: Array<{ path: string }> };
    expect(listed.pages.length).toBeGreaterThan(0);
    const firstPath = listed.pages[0].path;

    const { json } = await call({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'get_doc', arguments: { path: firstPath } },
    });
    const text = json?.result?.content?.[0]?.text;
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(50);
  });
});

describe('OPTIONS /api/v1/mcp', () => {
  it('returns 204 with Mcp-Session-Id and MCP-Protocol-Version in Access-Control-Allow-Headers', () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    const allow = res.headers.get('Access-Control-Allow-Headers') ?? '';
    expect(allow).toContain('Mcp-Session-Id');
    expect(allow).toContain('MCP-Protocol-Version');
  });
});
