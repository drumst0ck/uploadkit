import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../../auth';
import { connectDB, Project } from '@uploadkitdev/db';
import { isDomainOnCloudflare, isCloudflareOAuthConfigured } from '@uploadkitdev/cloudflare';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const domain = req.nextUrl.searchParams.get('domain')?.trim().toLowerCase();
  if (!domain || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(domain)) {
    return NextResponse.json({ error: 'Invalid domain' }, { status: 400 });
  }

  const { slug } = await params;
  await connectDB();

  const project = await Project.findOne({ slug, userId: session.user.id });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  try {
    const onCloudflare = await isDomainOnCloudflare(domain);
    return NextResponse.json({
      domain,
      onCloudflare,
      oauthConfigured: isCloudflareOAuthConfigured(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'DNS lookup failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
