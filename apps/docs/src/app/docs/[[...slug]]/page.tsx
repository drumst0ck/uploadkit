import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { findNeighbour } from 'fumadocs-core/page-tree';
import Link from 'next/link';
import { Fragment } from 'react';
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

const REPO = 'https://github.com/drumst0ck/uploadkit';

// CamelCase component names (UploadNotificationPanel) and package paths
// (@uploadkitdev/mcp) may wrap between words instead of breaking mid-word. <wbr> adds no characters to the heading text.
function TitleText({ text }: { text: string }) {
  return text.split(/(?<=[a-z])(?=[A-Z])|(?<=\/)/).map((part, i) => (
    <Fragment key={i}>
      {i > 0 ? <wbr /> : null}
      {part}
    </Fragment>
  ));
}

function PrevNext({ url }: { url: string }) {
  const { previous, next } = findNeighbour(source.pageTree, url);
  if (!previous && !next) return null;
  return (
    <nav className="uk-pn" aria-label="Previous and next page">
      {previous ? (
        <Link href={previous.url} rel="prev">
          <span className="uk-small">Previous</span>
          <span className="uk-pn__t">← {previous.name}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={next.url} rel="next">
          <span className="uk-small">Next</span>
          <span className="uk-pn__t">{next.name} →</span>
        </Link>
      ) : null}
    </nav>
  );
}

function PageFoot({ path }: { path: string }) {
  return (
    <div className="uk-foot">
      <a href={`${REPO}/blob/master/apps/docs/content/docs/${path}`}>Edit this page on GitHub</a>
      <a href={REPO}>drumst0ck/uploadkit</a>
      <span>MIT licensed</span>
    </div>
  );
}

function HomeHero() {
  return (
    <>
      <header className="uk-hero">
        <h1 className="uk-display">
          Uploads in
          <br />
          five minutes.
        </h1>
        <p className="uk-lead">UploadKit is an open-source file upload SDK with 40+ React components.</p>
        <div className="uk-acts">
          <Link className="uk-pill" href="/docs/getting-started/quickstart">
            Start the quickstart
          </Link>
          <Link className="uk-link" href="/docs/getting-started/nextjs">
            Next.js guide <span aria-hidden="true">→</span>
          </Link>
          <Link className="uk-link" href="/docs/api-reference/rest-api">
            REST API <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>
      <section className="uk-home-ways prose" aria-labelledby="ways">
        <h2 id="ways">Three ways in.</h2>
        <p>
          Works with Next.js, Remix, SvelteKit (core client) and Vite. Managed storage on Cloudflare R2, or your own
          S3, R2 or MinIO bucket.
        </p>
        <CodeBlock title="Terminal">
          <Pre>
            <code>{`# Add to an existing app
npm install @uploadkitdev/next @uploadkitdev/react

# Or start a new one
npx create-uploadkit-app my-app

# Or give your AI editor first-class knowledge of every component
npx -y @uploadkitdev/mcp`}</code>
          </Pre>
        </CodeBlock>
      </section>
    </>
  );
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

  // The docs home is the landing: no breadcrumb, no rail, display hero.
  const isHome = !slug || slug.length === 0;

  return (
    <DocsPage
      toc={isHome ? [] : data.toc}
      breadcrumb={{ enabled: false }}
      tableOfContent={isHome ? { enabled: false } : { single: true }}
      footer={{ enabled: false }}
      {...(isHome
        ? { className: 'uk-home', tableOfContentPopover: { enabled: false } }
        : {})}
      {...fullProp}
    >
      {isHome ? (
        <HomeHero />
      ) : (
        <>
          <DocsTitle className="uk-display">{data.title ? <TitleText text={data.title} /> : null}</DocsTitle>
          <DocsDescription className="uk-lead">{data.description}</DocsDescription>
        </>
      )}
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            a: createRelativeLink(source, page as any),
          })}
        />
      </DocsBody>
      <PrevNext url={page.url} />
      <PageFoot path={page.path} />
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
