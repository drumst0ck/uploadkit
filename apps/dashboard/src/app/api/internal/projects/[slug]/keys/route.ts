import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { nanoid } from 'nanoid';
import { auth } from '../../../../../../../auth';
import { connectDB, Project, ApiKey } from '@uploadkit/db';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// GET /api/internal/projects/[slug]/keys
// Returns all non-revoked API keys for the project. NEVER returns keyHash.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  // T-06-12: auth() guard
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  await connectDB();

  // T-06-10: scope project lookup with userId
  const project = await Project.findOne({ slug, userId: session.user.id }).lean();
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // T-06-09: select('-keyHash') — keyHash NEVER returned to client
  const keys = await ApiKey.find({ projectId: project._id, revokedAt: null })
    .select('-keyHash')
    .sort({ _id: -1 })
    .lean();

  return NextResponse.json(keys);
}

// POST /api/internal/projects/[slug]/keys
// Creates a new API key. Returns full plaintext key ONE TIME only.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  // T-06-12: auth() guard
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  await connectDB();

  // T-06-10: scope project lookup with userId
  const project = await Project.findOne({ slug, userId: session.user.id }).lean();
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const name =
    body !== null &&
    typeof body === 'object' &&
    'name' in body &&
    typeof (body as { name: unknown }).name === 'string'
      ? (body as { name: string }).name.trim()
      : 'Default';

  // Generate full key: uk_live_ + 32 random chars
  const fullKey = `uk_live_${nanoid(32)}`;
  // First 12 chars of full key as prefix for display
  const keyPrefix = fullKey.slice(0, 12);
  // T-06-09: SHA256 hash stored — plaintext never persisted
  const keyHash = createHash('sha256').update(fullKey).digest('hex');

  const apiKey = await ApiKey.create({
    keyPrefix,
    keyHash,
    name: name || 'Default',
    projectId: project._id,
    isTest: false,
  });

  // T-06-09: return full plaintext key ONCE at creation — never available again
  return NextResponse.json(
    {
      _id: apiKey._id,
      keyPrefix: apiKey.keyPrefix,
      name: apiKey.name,
      createdAt: apiKey.createdAt,
      // Full key returned only at creation — store it now
      fullKey,
    },
    { status: 201 },
  );
}

// DELETE /api/internal/projects/[slug]/keys
// Revokes an API key by setting revokedAt.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  // T-06-12: auth() guard
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  await connectDB();

  // T-06-10: scope project lookup with userId
  const project = await Project.findOne({ slug, userId: session.user.id }).lean();
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const keyId =
    body !== null &&
    typeof body === 'object' &&
    'keyId' in body &&
    typeof (body as { keyId: unknown }).keyId === 'string'
      ? (body as { keyId: string }).keyId
      : '';

  if (!keyId || !mongoose.isValidObjectId(keyId)) {
    return NextResponse.json({ error: 'Invalid key ID' }, { status: 400 });
  }

  // T-06-10: verify key belongs to this project+user before revoking
  const updated = await ApiKey.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(keyId),
      projectId: project._id,
      revokedAt: null,
    },
    { $set: { revokedAt: new Date() } },
    { new: true },
  );

  if (!updated) {
    return NextResponse.json({ error: 'Key not found or already revoked' }, { status: 404 });
  }

  return NextResponse.json({ revoked: true });
}
