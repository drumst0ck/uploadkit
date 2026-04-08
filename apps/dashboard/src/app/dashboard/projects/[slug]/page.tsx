import { redirect } from 'next/navigation';

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

// Default project view redirects to the files sub-page.
// The layout above already validates the project exists and belongs to the user.
export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  redirect(`/dashboard/projects/${slug}/files`);
}
