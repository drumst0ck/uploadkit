export const runtime = 'nodejs';

import { type NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB, FileRouter, Project } from '@uploadkit/db';
import { NotFoundError } from '@uploadkit/shared';
import { withApiKey, type ApiContext } from '@/lib/with-api-key';
import { UpdateFileRouterSchema } from '@/lib/schemas';
import { serializeValidationError, serializeError } from '@/lib/errors';

// PATCH /api/v1/routers/:routerId — update file router config
async function handlePatch(
  req: NextRequest,
  ctx: ApiContext,
  params: Record<string, string | string[]>,
): Promise<NextResponse> {
  const routerId = params['routerId'] as string;

  if (!Types.ObjectId.isValid(routerId)) {
    throw new NotFoundError('FileRouter', routerId);
  }

  const body = await req.json() as unknown;
  const parsed = UpdateFileRouterSchema.safeParse(body);
  if (!parsed.success) {
    return serializeValidationError(parsed.error);
  }

  await connectDB();

  // T-03-17: verify router's project belongs to the authenticated user
  const router = await FileRouter.findById(routerId);
  if (!router) {
    throw new NotFoundError('FileRouter', routerId);
  }

  const project = await Project.findOne({
    _id: router.projectId,
    userId: ctx.project.userId,
  });
  if (!project) {
    throw new NotFoundError('FileRouter', routerId);
  }

  const updated = await FileRouter.findByIdAndUpdate(
    routerId,
    { $set: parsed.data },
    { new: true },
  ).lean();

  return NextResponse.json({ router: updated });
}

// DELETE /api/v1/routers/:routerId — remove a file router
async function handleDelete(
  _req: NextRequest,
  ctx: ApiContext,
  params: Record<string, string | string[]>,
): Promise<NextResponse> {
  const routerId = params['routerId'] as string;

  if (!Types.ObjectId.isValid(routerId)) {
    throw new NotFoundError('FileRouter', routerId);
  }

  await connectDB();

  // T-03-17: verify router's project belongs to the authenticated user
  const router = await FileRouter.findById(routerId);
  if (!router) {
    throw new NotFoundError('FileRouter', routerId);
  }

  const project = await Project.findOne({
    _id: router.projectId,
    userId: ctx.project.userId,
  });
  if (!project) {
    throw new NotFoundError('FileRouter', routerId);
  }

  await FileRouter.deleteOne({ _id: routerId });

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
