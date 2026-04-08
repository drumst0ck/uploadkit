export const runtime = 'nodejs';

import { createHash } from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { nanoid } from 'nanoid';
import { connectDB, ApiKey, Project } from '@uploadkit/db';
import { NotFoundError, TierLimitError } from '@uploadkit/shared';
import { TIER_LIMITS, API_KEY_PREFIX } from '@uploadkit/shared';
import { withApiKey, type ApiContext } from '@/lib/with-api-key';
import { CreateApiKeySchema } from '@/lib/schemas';
import { serializeValidationError, serializeError } from '@/lib/errors';

// GET /api/v1/projects/:id/keys — list active API keys for a project
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

  // T-03-14: verify project belongs to authenticated user before listing keys
  const project = await Project.findOne({ _id: id, userId: ctx.project.userId });
  if (!project) {
    throw new NotFoundError('Project', id);
  }

  // Return key list without hash (keyHash is never returned to clients)
  const keys = await ApiKey.find({ projectId: id, revokedAt: null }).select('-keyHash').lean();

  return NextResponse.json({ keys });
}

// POST /api/v1/projects/:id/keys — create a new API key (T-03-15)
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
  const parsed = CreateApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return serializeValidationError(parsed.error);
  }

  await connectDB();

  // T-03-14: verify project belongs to authenticated user
  const project = await Project.findOne({ _id: id, userId: ctx.project.userId });
  if (!project) {
    throw new NotFoundError('Project', id);
  }

  // Enforce tier limit on API key count
  const keyCount = await ApiKey.countDocuments({ projectId: id, revokedAt: null });
  if (keyCount >= TIER_LIMITS[ctx.tier].maxApiKeys) {
    return serializeError(new TierLimitError('API keys'));
  }

  // Generate full key with environment prefix
  const isTest = parsed.data.isTest ?? false;
  const prefix = isTest ? API_KEY_PREFIX.test : API_KEY_PREFIX.live;
  const fullKey = prefix + nanoid(32);

  // T-03-15: hash with SHA256 — plaintext key never persisted
  const keyHash = createHash('sha256').update(fullKey).digest('hex');

  const doc = await ApiKey.create({
    keyPrefix: fullKey.slice(0, 12),
    keyHash,
    name: parsed.data.name ?? 'Default',
    projectId: id,
    isTest,
  });

  // T-03-15: full key returned ONLY at creation time — cannot be retrieved again
  return NextResponse.json(
    {
      apiKey: {
        id: doc._id,
        keyPrefix: doc.keyPrefix,
        name: doc.name,
        isTest: doc.isTest,
        createdAt: doc.createdAt,
      },
      key: fullKey,
    },
    { status: 201 },
  );
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
