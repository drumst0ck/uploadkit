export const runtime = 'nodejs';

import { type NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB, Project, ApiKey } from '@uploadkit/db';
import { NotFoundError } from '@uploadkit/shared';
import { withApiKey, type ApiContext } from '@/lib/with-api-key';
import { UpdateProjectSchema } from '@/lib/schemas';
import { serializeValidationError, serializeError } from '@/lib/errors';

// PATCH /api/v1/projects/:id — update project name
async function handlePatch(
  req: NextRequest,
  ctx: ApiContext,
  params: Record<string, string | string[]>,
): Promise<NextResponse> {
  const id = params['id'] as string;

  // Validate ObjectId format before DB query
  if (!Types.ObjectId.isValid(id)) {
    throw new NotFoundError('Project', id);
  }

  const body = await req.json() as unknown;
  const parsed = UpdateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return serializeValidationError(parsed.error);
  }

  await connectDB();

  const project = await Project.findOneAndUpdate(
    { _id: id, userId: ctx.project.userId },
    { $set: parsed.data },
    { new: true },
  ).lean();

  if (!project) {
    throw new NotFoundError('Project', id);
  }

  return NextResponse.json({ project });
}

// DELETE /api/v1/projects/:id — delete project and revoke all associated API keys
async function handleDelete(
  _req: NextRequest,
  ctx: ApiContext,
  params: Record<string, string | string[]>,
): Promise<NextResponse> {
  const id = params['id'] as string;

  if (!Types.ObjectId.isValid(id)) {
    throw new NotFoundError('Project', id);
  }

  await connectDB();

  // Verify project belongs to user
  const project = await Project.findOne({ _id: id, userId: ctx.project.userId });
  if (!project) {
    throw new NotFoundError('Project', id);
  }

  // Revoke all API keys associated with this project (cascade)
  await ApiKey.updateMany(
    { projectId: id },
    { $set: { revokedAt: new Date() } },
  );

  await Project.deleteOne({ _id: id });

  return NextResponse.json({ ok: true });
}

export const PATCH = withApiKey(async (req, ctx, params) => {
  try {
    return await handlePatch(req, ctx, params ?? {});
  } catch (err) {
    return serializeError(err);
  }
});

export const DELETE = withApiKey(async (req, ctx, params) => {
  try {
    return await handleDelete(req, ctx, params ?? {});
  } catch (err) {
    return serializeError(err);
  }
});
