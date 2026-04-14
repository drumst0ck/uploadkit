export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { SERVER_INFO } from '@uploadkitdev/mcp-core';

export function GET(): Response {
  return NextResponse.json({
    status: 'ok',
    version: SERVER_INFO.version,
    tools: 11,
  });
}
