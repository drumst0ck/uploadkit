import { NextResponse } from 'next/server';
import { connectDB } from '@uploadkitdev/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DB_TIMEOUT_MS = 3000;

async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// GET /api/health — public, unauthenticated liveness + lightweight DB ping.
// Returns only coarse up/down flags: never connection strings or error text.
export async function GET(): Promise<NextResponse> {
  let database: 'up' | 'down' = 'down';
  try {
    const conn = await withTimeout(connectDB(), DB_TIMEOUT_MS);
    const db = conn.connection.db;
    if (db) {
      await withTimeout(db.admin().ping(), DB_TIMEOUT_MS);
      database = 'up';
    }
  } catch {
    database = 'down';
  }

  const ok = database === 'up';
  return NextResponse.json(
    { status: ok ? 'ok' : 'degraded', checks: { database }, checkedAt: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
