export const runtime = 'nodejs';

import { type NextRequest, NextResponse } from 'next/server';
import { connectDB, UsageRecord } from '@uploadkit/db';
import { withApiKey, type ApiContext } from '@/lib/with-api-key';
import { serializeError } from '@/lib/errors';

// GET /api/v1/usage/history — past 12 periods of usage (API-06)
async function handleGet(
  _req: NextRequest,
  ctx: ApiContext,
): Promise<NextResponse> {
  await connectDB();

  const history = await UsageRecord.find({ userId: ctx.project.userId })
    .sort({ period: -1 })
    .limit(12)
    .lean();

  return NextResponse.json({ history });
}

export const GET = withApiKey(async (req, ctx) => {
  try {
    return await handleGet(req, ctx);
  } catch (err) {
    return serializeError(err);
  }
});
