export const runtime = 'nodejs';

import { type NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB, ApiKey, Project } from '@uploadkitdev/db';
import { NotFoundError } from '@uploadkitdev/shared';
import { withApiKey, type ApiContext } from '@/lib/with-api-key';
import { serializeError } from '@/lib/errors';

// DELETE /api/v1/keys/:keyId — revoke an API key
async function handleDelete(
  _req: NextRequest,
  ctx: ApiContext,
  params: Record<string, string | string[]>,
): Promise<NextResponse> {
  const keyId = params['keyId'] as string;

  if (!Types.ObjectId.isValid(keyId)) {
    throw new NotFoundError('ApiKey', keyId);
  }

  await connectDB();

  // Look up the key (must be active)
  const apiKey = await ApiKey.findOne({ _id: keyId, revokedAt: null });
  if (!apiKey) {
    throw new NotFoundError('ApiKey', keyId);
  }

  // T-03-14: verify the key's project belongs to the authenticated user
  const project = await Project.findOne({
    _id: apiKey.projectId,
    userId: ctx.project.userId,
  });
  if (!project) {
    throw new NotFoundError('ApiKey', keyId);
  }

  await ApiKey.findByIdAndUpdate(keyId, { $set: { revokedAt: new Date() } });

  return NextResponse.json({ ok: true });
}

export const DELETE = withApiKey(async (req, ctx, params) => {
  try {
    return await handleDelete(req, ctx, params ?? {});
  } catch (err) {
    return serializeError(err);
  }
});
