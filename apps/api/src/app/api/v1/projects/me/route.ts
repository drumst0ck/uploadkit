export const runtime = 'nodejs';

import { type NextRequest, NextResponse } from 'next/server';
import { withApiKey, type ApiContext } from '@/lib/with-api-key';
import { serializeError } from '@/lib/errors';

// GET /api/v1/projects/me — the project the API key belongs to and the account
// tier. Used by the CLI to verify a key and warn about plan limits.
async function handleGet(_req: NextRequest, ctx: ApiContext): Promise<NextResponse> {
  const { project, tier } = ctx;
  return NextResponse.json({
    project: { _id: String(project._id), name: project.name, slug: project.slug, tier },
    tier,
  });
}

export const GET = withApiKey(async (req, ctx) => {
  try {
    return await handleGet(req, ctx);
  } catch (err) {
    return serializeError(err);
  }
});
