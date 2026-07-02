import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '../../../../../../../auth';
import { connectDB, File, Project, Subscription } from '@uploadkitdev/db';
import { TIER_LIMITS, type Tier } from '@uploadkitdev/shared';
import {
  createDashboardTransformUrl,
  reserveDashboardTransform,
  type DashboardImageTransform,
} from '../../../../../../lib/dashboard-image-transforms';

export const runtime = 'nodejs';

const schema = z.object({
  fileId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid image ID'),
  width: z.number().int().min(1).max(4096).optional(),
  height: z.number().int().min(1).max(4096).optional(),
  fit: z.enum(['scale-down', 'contain', 'cover', 'crop', 'pad']),
  quality: z.number().int().min(1).max(100),
  format: z.enum(['auto', 'avif', 'webp', 'jpeg', 'png']),
  delivery: z.enum(['signed', 'public']).default('public'),
}).refine((value) => value.width !== undefined || value.height !== undefined, {
  message: 'Set a width or height.',
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid transformation' }, { status: 400 });
  }

  const { slug } = await params;
  await connectDB();
  const project = await Project.findOne({ slug, userId: session.user.id }).lean();
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const [file, subscription] = await Promise.all([
    File.findOne({
      _id: parsed.data.fileId,
      projectId: project._id,
      status: 'UPLOADED',
      deletedAt: null,
    }).lean(),
    Subscription.findOne({ userId: session.user.id }).lean(),
  ]);
  if (!file) return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Only images can be transformed' }, { status: 415 });

  const tier: Tier = subscription?.tier ?? 'FREE';
  if (tier === 'FREE') {
    return NextResponse.json({ error: 'Transformations require a paid plan', upgradeRequired: true }, { status: 403 });
  }

  const { fileId: _fileId, delivery, ...rawTransform } = parsed.data;
  const transform = rawTransform as DashboardImageTransform;
  try {
    const result = createDashboardTransformUrl(file.key, transform, delivery);
    const usage = await reserveDashboardTransform({
      userId: project.userId,
      projectId: project._id,
      fileId: file._id,
      key: file.key,
      transform,
      limit: subscription?.imageTransformLimit ?? TIER_LIMITS[tier].maxImageTransformsPerMonth,
    });
    return NextResponse.json({ ...result, transform, usage });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create transformation';
    return NextResponse.json({ error: message }, { status: message.includes('limit') ? 429 : 500 });
  }
}
