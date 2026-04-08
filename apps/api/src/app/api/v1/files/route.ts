export const runtime = 'nodejs';

import { type NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB, File } from '@uploadkit/db';
import { withApiKey, type ApiContext } from '@/lib/with-api-key';
import { PaginationSchema } from '@/lib/schemas';
import { serializeValidationError, serializeError } from '@/lib/errors';

// GET /api/v1/files — cursor-paginated list of files for the authenticated project
async function handleGet(req: NextRequest, ctx: ApiContext): Promise<NextResponse> {
  const url = new URL(req.url);
  const params = PaginationSchema.safeParse({
    limit: url.searchParams.get('limit'),
    cursor: url.searchParams.get('cursor'),
  });

  if (!params.success) {
    return serializeValidationError(params.error);
  }

  await connectDB();

  const { limit, cursor } = params.data;

  // Cursor-based pagination: query files older than the cursor ID
  const filter = cursor
    ? { projectId: ctx.project._id, _id: { $lt: new Types.ObjectId(cursor) }, deletedAt: null }
    : { projectId: ctx.project._id, deletedAt: null };

  const files = await File.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = files.length > limit;
  const nextCursor = hasMore ? files[limit - 1]!._id.toString() : null;

  return NextResponse.json({
    files: files.slice(0, limit),
    nextCursor,
    hasMore,
  });
}

export const GET = withApiKey(async (req, ctx) => {
  try {
    return await handleGet(req, ctx);
  } catch (err) {
    return serializeError(err);
  }
});
