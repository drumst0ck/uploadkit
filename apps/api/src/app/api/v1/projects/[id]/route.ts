export const runtime = 'nodejs';

import { type NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB, Project, ApiKey, File, FileRouter } from '@uploadkitdev/db';
import { NotFoundError } from '@uploadkitdev/shared';
import { withApiKey, type ApiContext } from '@/lib/with-api-key';
import { withUserQuotaLock } from '@/lib/user-quota';
import { deleteStoredFile } from '@/lib/delete-stored-file';
import { assertProjectScope } from '@/lib/project-scope';
import { projectResponse } from '@/lib/project-response';
import { UpdateProjectSchema } from '@/lib/schemas';
import { syncCdnAccessMarker } from '@/lib/cdn-access';
import { readJson, serializeValidationError, serializeError } from '@/lib/errors';

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

  const body = await readJson(req) as unknown;
  const parsed = UpdateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return serializeValidationError(parsed.error);
  }

  await connectDB();

  const filter = { _id: id, userId: ctx.project.userId };
  const target = parsed.data.cdnAccess;
  let project;

  if (target === undefined) {
    project = await Project.findOneAndUpdate(filter, { $set: parsed.data }, { new: true }).lean();
  } else {
    // Ordering guarantees the worker never enforces signing while the API
    // still hands out unsigned URLs (extra ?exp/sig on a public worker is harmless):
    //  - public -> signed: DB first (API starts signing), then marker (worker starts enforcing);
    //    revert the DB if the marker write fails.
    //  - signed -> public: marker removed first (worker stops enforcing), then DB.
    const existing = await Project.findOne(filter).lean();
    if (!existing) throw new NotFoundError('Project', id);
    const previous = existing.cdnAccess ?? 'public';

    if (target === 'signed') {
      project = await Project.findOneAndUpdate(filter, { $set: parsed.data }, { new: true }).lean();
      try {
        await syncCdnAccessMarker(id, 'signed');
      } catch (err) {
        await Project.findOneAndUpdate(filter, { $set: { cdnAccess: previous } }).lean();
        throw err;
      }
    } else {
      await syncCdnAccessMarker(id, 'public');
      try {
        project = await Project.findOneAndUpdate(filter, { $set: parsed.data }, { new: true }).lean();
      } catch (err) {
        if (previous === 'signed') await syncCdnAccessMarker(id, 'signed').catch(() => undefined);
        throw err;
      }
    }
  }

  if (!project) {
    throw new NotFoundError('Project', id);
  }

  return NextResponse.json({ project: projectResponse(project) });
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

  // The user quota lock excludes API upload creation/completion during this
  // cascade. Leave keys active on storage failures so callers can retry.
  const files = await File.find({ projectId: id, status: { $ne: 'DELETED' } }).lean();
  for (const file of files) {
    await deleteStoredFile(file, ctx.project.userId);
  }
  await FileRouter.deleteMany({ projectId: id });
  await ApiKey.updateMany(
    { projectId: id },
    { $set: { revokedAt: new Date() } },
  );
  await Project.deleteOne({ _id: id });

  return NextResponse.json({ ok: true });
}

export const PATCH = withApiKey(async (req, ctx, params) => {
  try {
    assertProjectScope(ctx, params?.['id']);
    return await handlePatch(req, ctx, params ?? {});
  } catch (err) {
    return serializeError(err);
  }
});

export const DELETE = withApiKey(async (req, ctx, params) => {
  try {
    assertProjectScope(ctx, params?.['id']);
    return await withUserQuotaLock(ctx.project.userId, () => handleDelete(req, ctx, params ?? {}));
  } catch (err) {
    return serializeError(err);
  }
});
