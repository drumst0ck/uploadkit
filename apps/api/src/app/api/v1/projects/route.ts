export const runtime = 'nodejs';

import { type NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { connectDB, Project } from '@uploadkit/db';
import { TierLimitError } from '@uploadkit/shared';
import { TIER_LIMITS } from '@uploadkit/shared';
import { withApiKey, type ApiContext } from '@/lib/with-api-key';
import { CreateProjectSchema } from '@/lib/schemas';
import { serializeValidationError, serializeError } from '@/lib/errors';

// GET /api/v1/projects — list all projects for the authenticated user
async function handleGet(
  _req: NextRequest,
  ctx: ApiContext,
): Promise<NextResponse> {
  await connectDB();
  const projects = await Project.find({ userId: ctx.project.userId }).lean();
  return NextResponse.json({ projects });
}

// POST /api/v1/projects — create a new project
async function handlePost(
  req: NextRequest,
  ctx: ApiContext,
): Promise<NextResponse> {
  const body = await req.json() as unknown;
  const parsed = CreateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return serializeValidationError(parsed.error);
  }

  await connectDB();

  // Enforce tier limit on project count
  const projectCount = await Project.countDocuments({ userId: ctx.project.userId });
  if (projectCount >= TIER_LIMITS[ctx.tier].maxProjects) {
    return serializeError(new TierLimitError('projects'));
  }

  // Generate a URL-safe slug from name + random suffix
  const slug =
    parsed.data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') +
    '-' +
    nanoid(6);

  const project = await Project.create({
    name: parsed.data.name,
    slug,
    userId: ctx.project.userId,
  });

  return NextResponse.json({ project }, { status: 201 });
}

export const GET = withApiKey(async (req, ctx) => {
  try {
    return await handleGet(req, ctx);
  } catch (err) {
    return serializeError(err);
  }
});

export const POST = withApiKey(async (req, ctx) => {
  try {
    return await handlePost(req, ctx);
  } catch (err) {
    return serializeError(err);
  }
});
