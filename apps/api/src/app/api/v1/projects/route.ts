export const runtime = 'nodejs';

import { type NextRequest, NextResponse } from 'next/server';
import { connectDB, Project } from '@uploadkitdev/db';
import { UploadKitError } from '@uploadkitdev/shared';
import { withApiKey, type ApiContext } from '@/lib/with-api-key';
import { projectResponse } from '@/lib/project-response';
import { serializeError } from '@/lib/errors';

// GET /api/v1/projects — a project key only sees its own project. Listing every
// project of the account is an account-level operation (dashboard session), not
// something a project-scoped credential may do.
async function handleGet(
  _req: NextRequest,
  ctx: ApiContext,
): Promise<NextResponse> {
  await connectDB();
  const project = await Project.findOne({ _id: ctx.project._id, userId: ctx.project.userId }).lean();
  return NextResponse.json({ projects: project ? [projectResponse(project)] : [] });
}

export const GET = withApiKey(async (req, ctx) => {
  try {
    return await handleGet(req, ctx);
  } catch (err) {
    return serializeError(err);
  }
});

// POST /api/v1/projects — creating projects needs account-level authority that a
// project API key does not have. Create projects from the dashboard.
export const POST = withApiKey(async () => serializeError(new UploadKitError(
  'FORBIDDEN',
  'Project API keys cannot create projects. Create projects from the dashboard.',
  403,
)));
