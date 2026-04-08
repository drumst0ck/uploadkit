import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { getMDXComponents } from '@/components/mdx';
import { source } from '@/lib/source';
import type { MDXContent } from 'mdx/types';
import type { TOCItemType } from 'fumadocs-core/toc';

// fumadocs-mdx adds body/toc/structuredData to page.data at runtime;
// PageData base type does not declare them — cast locally instead of globally.
interface MdxPageData {
  title?: string;
  description?: string;
  body: MDXContent;
  toc: TOCItemType[];
  full?: boolean;
}

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const data = page.data as unknown as MdxPageData;
  const MDX = data.body;

  // Spread full only when explicitly true to satisfy exactOptionalPropertyTypes
  const fullProp = data.full === true ? { full: true as const } : {};

  return (
    <DocsPage toc={data.toc} {...fullProp}>
      <DocsTitle>{data.title}</DocsTitle>
      <DocsDescription>{data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            a: createRelativeLink(source, page as any),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
