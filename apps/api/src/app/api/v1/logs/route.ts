import { type NextRequest, NextResponse } from 'next/server';
import { File } from '@uploadkit/db';
import { LogsQuerySchema } from '@/lib/schemas';
import { serializeValidationError } from '@/lib/errors';
import { withApiKey, type ApiContext } from '@/lib/with-api-key';

export const runtime = 'nodejs';

async function handler(req: NextRequest, ctx: ApiContext): Promise<NextResponse> {
  const url = new URL(req.url);
  const parsed = LogsQuerySchema.safeParse({
    since: url.searchParams.get('since'),
    limit: url.searchParams.get('limit'),
  });

  if (!parsed.success) {
    return serializeValidationError(parsed.error);
  }

  // T-03-20: logs scoped by projectId from withApiKey context — cannot view other project's logs
  const files = await File.find({
    projectId: ctx.project._id,
    createdAt: { $gt: parsed.data.since },
  })
    .sort({ createdAt: -1 })
    .limit(parsed.data.limit)
    .lean();

  return NextResponse.json({
    logs: files.map((f) => ({
      id: f._id,
      key: f.key,
      name: f.name,
      size: f.size,
      type: f.type,
      status: f.status,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    })),
    count: files.length,
  });
}

// GET /api/v1/logs?since=timestamp — upload event polling endpoint (API-07)
// Designed for 5-second polling from the dashboard; the `since` param is
// the timestamp of the last received event.
export const GET = withApiKey(handler);
