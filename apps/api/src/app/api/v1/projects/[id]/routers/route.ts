export const runtime = 'nodejs';

import { type NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB, FileRouter, Project } from '@uploadkit/db';
import { NotFoundError } from '@uploadkit/shared';
import { withApiKey, type ApiContext } from '@/lib/with-api-key';
import { CreateFileRouterSchema } from '@/lib/schemas';
import { serializeValidationError, serializeError } from '@/lib/errors';

// GET /api/v1/projects/:id/routers — list file routers for a project
async function handleGet(
  _req: NextRequest,
  ctx: ApiContext,
  params: Record<string, string | string[]>,
): Promise<NextResponse> {
  const id = params['id'] as string;

  if (!Types.ObjectId.isValid(id)) {
    throw new NotFoundError('Project', id);
  }

  await connectDB();

  // T-03-17: verify project ownership before listing
  const project = await Project.findOne({ _id: id, userId: ctx.project.userId });
  if (!project) {
    throw new NotFoundError('Project', id);
  }

  const routers = await FileRouter.find({ projectId: id }).lean();
  return NextResponse.json({ routers });
}

// POST /api/v1/projects/:id/routers — create a new file router
async function handlePost(
  req: NextRequest,
  ctx: ApiContext,
  params: Record<string, string | string[]>,
): Promise<NextResponse> {
  const id = params['id'] as string;

  if (!Types.ObjectId.isValid(id)) {
    throw new NotFoundError('Project', id);
  }

  const body = await req.json() as unknown;
  const parsed = CreateFileRouterSchema.safeParse(body);
  if (!parsed.success) {
    return serializeValidationError(parsed.error);
  }

  await connectDB();

  // T-03-17: verify project ownership before creation
  const project = await Project.findOne({ _id: id, userId: ctx.project.userId });
  if (!project) {
    throw new NotFoundError('Project', id);
  }

  try {
    // Build creation payload — omit undefined optional fields to satisfy exactOptionalPropertyTypes
    const payload: {
      slug: string;
      projectId: string;
      maxFileSize?: number;
      maxFileCount?: number;
      allowedTypes?: string[];
      webhookUrl?: string;
    } = { slug: parsed.data.slug, projectId: id };
    if (parsed.data.maxFileSize !== undefined) payload.maxFileSize = parsed.data.maxFileSize;
    if (parsed.data.maxFileCount !== undefined) payload.maxFileCount = parsed.data.maxFileCount;
    if (parsed.data.allowedTypes !== undefined) payload.allowedTypes = parsed.data.allowedTypes;
    if (parsed.data.webhookUrl !== undefined) payload.webhookUrl = parsed.data.webhookUrl;

    const router = await FileRouter.create(payload);
    return NextResponse.json({ router }, { status: 201 });
  } catch (err: unknown) {
    // Handle MongoDB duplicate key error (slug must be unique per project)
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000) {
      return NextResponse.json(
        {
          error: {
            type: 'invalid_request',
            code: 'DUPLICATE_SLUG',
            message: `A file router with slug '${parsed.data.slug}' already exists in this project`,
          },
        },
        { status: 409 },
      );
    }
    throw err;
  }
}

export const GET = withApiKey(async (req, ctx, params) => {
  try {
    return await handleGet(req, ctx, params ?? {});
  } catch (err) {
    return serializeError(err);
  }
});

export const POST = withApiKey(async (req, ctx, params) => {
  try {
    return await handlePost(req, ctx, params ?? {});
  } catch (err) {
    return serializeError(err);
  }
});
