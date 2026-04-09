export const runtime = 'nodejs';

import { type NextRequest, NextResponse } from 'next/server';
import { connectDB, UsageRecord } from '@uploadkitdev/db';
import { TIER_LIMITS } from '@uploadkitdev/shared';
import { withApiKey, type ApiContext } from '@/lib/with-api-key';
import { serializeError } from '@/lib/errors';

// GET /api/v1/usage — current period usage + tier limits (API-06)
async function handleGet(
  _req: NextRequest,
  ctx: ApiContext,
): Promise<NextResponse> {
  await connectDB();

  const period = new Date().toISOString().slice(0, 7); // YYYY-MM
  const record = await UsageRecord.findOne({
    userId: ctx.project.userId,
    period,
  }).lean();

  return NextResponse.json({
    usage: {
      period,
      storageUsed: record?.storageUsed ?? 0,
      bandwidth: record?.bandwidth ?? 0,
      uploads: record?.uploads ?? 0,
    },
    limits: TIER_LIMITS[ctx.tier],
  });
}

export const GET = withApiKey(async (req, ctx) => {
  try {
    return await handleGet(req, ctx);
  } catch (err) {
    return serializeError(err);
  }
});
