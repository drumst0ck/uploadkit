import { type NextRequest, NextResponse } from 'next/server';

// CORS headers for API routes — SDK clients call from browser origins.
// Wildcard is safe here because the public surface (SDK + /api/v1/mcp) is
// read-only for remote clients and carries no cookies/session state.
// See .planning/phases/11-mcp-remote-server/11-CONTEXT.md §Auth / Security.
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-uploadkit-version, Mcp-Session-Id, MCP-Protocol-Version',
  'Access-Control-Max-Age': '86400',
};

export function middleware(request: NextRequest) {
  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  // Add CORS headers to all API responses
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

// Only apply to API routes
export const config = {
  matcher: '/api/:path*',
};
