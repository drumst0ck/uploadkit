import type { Metadata } from 'next'
import Link from 'next/link'
import {
  LandingShell,
  LandingHero,
  LandingSection,
  CodeBlock,
  FeatureList,
  FaqSection,
  CtaBand,
  RelatedLinks,
  JsonLd,
} from '@/components/landing'
import { ORGANIZATION, breadcrumbJsonLd, faqJsonLd, graph, type FaqEntry } from '@/lib/json-ld'

const TITLE = 'Remix & React Router File Upload with UploadKit'
const DESCRIPTION =
  'File uploads for Remix and React Router v7: UploadKit React components, a presigned URL action that sends files straight to R2 or S3, and a starter template.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://uploadkit.dev/remix' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://uploadkit.dev/remix',
    type: 'website',
    images: ['/og/home.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og/home.png'],
  },
}

const FAQ: FaqEntry[] = [
  {
    question: 'Is there a dedicated Remix adapter?',
    answer:
      'No. @uploadkitdev/next is the typed server handler, and it targets Next.js. In Remix and React Router v7 you use the React components from @uploadkitdev/react and write the signing endpoint yourself as a route action. The starter template ships one.',
  },
  {
    question: 'What does npx uploadkit init do in a Remix project?',
    answer:
      'It detects Remix or React Router (@remix-run/* or @react-router/dev), wraps the body of app/root.tsx in UploadKitProvider with endpoint="/api/uploadkit", creates app/routes/api.uploadkit.$.tsx, adds UPLOADKIT_API_KEY to .env and installs @uploadkitdev/react and @uploadkitdev/core. The generated route is a placeholder: it returns a 501 error until you implement server-side forwarding, so the generated app does not look configured when it is not.',
  },
  {
    question: 'Does it work with Remix v2 and React Router v7?',
    answer:
      'Yes. The detector treats both as the same target, and the starter template is a React Router v7 app in framework mode. The presigned URL pattern in our Remix tutorial is the same on both, only the import names change.',
    link: { label: 'Remix and React Router tutorial', href: '/blog/file-uploads-remix-react-router' },
  },
  {
    question: 'Why not parse multipart form data in the action?',
    answer:
      'Parsing the upload in the action sends every byte through your server, which runs into platform body limits and makes progress reporting harder. A presigned URL keeps the file off your server: the action returns a short-lived URL and the browser uploads directly to storage.',
    link: { label: 'Presigned URLs vs server proxy', href: '/blog/presigned-urls-vs-server-proxy' },
  },
  {
    question: 'Can I use my own bucket?',
    answer:
      'Yes. The template action signs a PUT URL against Cloudflare R2 or any S3-compatible bucket, using credentials from your server environment. See the BYOS docs for the model.',
    link: { label: 'BYOS docs', href: 'https://docs.uploadkit.dev/docs/core-concepts/byos' },
  },
  {
    question: 'What does it cost?',
    answer:
      'The free plan includes 5 GB storage, 2 GB bandwidth per month, a 4 MB maximum file size and 1,000 uploads per month. Pro is $15 per month and Team is $35 per month.',
    link: { label: 'See pricing', href: '/pricing' },
  },
]

const SCAFFOLD = 'npx create-uploadkit-app my-app --template remix'
const INSTALL = 'pnpm add @uploadkitdev/react @uploadkitdev/core'

const ACTION = `import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function action({ request }: { request: Request }) {
  if (request.method !== 'POST') {
    return Response.json(
      { error: 'Method not allowed' },
      { status: 405, headers: { Allow: 'POST' } },
    );
  }

  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw.filename !== 'string' || typeof raw.contentType !== 'string') {
    return Response.json(
      { error: 'Body must be { filename: string, contentType: string }' },
      { status: 400 },
    );
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: \`https://\${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com\`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  const key = \`\${crypto.randomUUID()}-\${raw.filename}\`;

  // ContentType MUST match the client's PUT header exactly — mismatch → 403.
  const url = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      ContentType: raw.contentType,
    }),
    { expiresIn: 60 * 5 },
  );

  return Response.json({ url, key, method: 'PUT' as const });
}`

const ROUTE = `import { UploadDropzone, UploadKitProvider } from '@uploadkitdev/react';

export default function Index() {
  return (
    <UploadKitProvider endpoint="/api/sign">
      <main>
        <UploadDropzone
          onUploadComplete={(results) => {
            console.log('uploaded', results);
          }}
          onUploadError={(error) => {
            console.error('upload error', error);
          }}
        />
      </main>
    </UploadKitProvider>
  );
}`

const ROOT = `import '@uploadkitdev/react/styles.css';`

const LIMITS = [
  { title: 'Free', description: '5 GB storage, 2 GB bandwidth per month, 4 MB max file, 1,000 uploads per month, 2 projects.' },
  { title: 'Pro — $15/mo', description: '100 GB storage, 200 GB bandwidth, 512 MB max file, 50,000 uploads per month, 10 projects.' },
  { title: 'Team — $35/mo', description: '1 TB storage, 2 TB bandwidth, 5 GB max file, 500,000 uploads per month, 50 projects.' },
  { title: 'Enterprise', description: 'Custom limits. See the pricing page.' },
]

export default function RemixLandingPage() {
  return (
    <LandingShell>
      <JsonLd
        data={graph(
          ORGANIZATION,
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Remix', path: '/remix' },
          ]),
          faqJsonLd(FAQ),
        )}
      />
      <nav className="d2-container" aria-label="Breadcrumb" style={{ paddingTop: 24, fontSize: 14 }}>
        <Link href="/">Home</Link> <span aria-hidden="true">›</span> <span aria-current="page">Remix</span>
      </nav>

      <LandingHero
        eyebrow="Remix and React Router"
        title="File uploads for Remix and React Router v7"
        lead="Use the UploadKit React components in a Remix or React Router v7 app and sign uploads in a route action. The action returns a presigned PUT URL, and the browser sends the file directly to Cloudflare R2 or any S3-compatible bucket."
        secondaryCta={{ label: 'Read the Remix tutorial', href: '/blog/file-uploads-remix-react-router' }}
      />

      <LandingSection
        id="quickstart"
        eyebrow="Quickstart"
        title="Start a Remix or React Router upload project"
        lead="The fastest path is the starter template. It is a React Router v7 app in framework mode with an UploadDropzone and a signing action."
      >
        <h3>1. Scaffold the app</h3>
        <CodeBlock lang="bash" code={SCAFFOLD} />
        <p>
          In an existing project, install the packages instead. <code>npx uploadkit init</code> does the install
          and wraps <code>app/root.tsx</code> for you, but see the note below about its generated route.
        </p>
        <CodeBlock lang="bash" code={INSTALL} />
        <h3>2. Sign uploads in a route action</h3>
        <p>
          The template&apos;s action validates the body, builds a presigned PUT URL with the AWS SDK and returns{' '}
          <code>{'{ url, key, method }'}</code>. It reads R2 credentials from the server environment, so the
          browser never sees them. Add authentication in this action before you ship.
        </p>
        <CodeBlock lang="typescript" title="app/routes/api.sign.ts" code={ACTION} />
        <h3>3. Render the dropzone</h3>
        <CodeBlock lang="tsx" title="app/routes/_index.tsx" code={ROUTE} />
        <CodeBlock lang="typescript" title="app/root.tsx (import the component styles)" code={ROOT} />
        <p>
          <strong>About <code>uploadkit init</code>.</strong> For Remix it creates{' '}
          <code>app/routes/api.uploadkit.$.tsx</code> and points the provider at <code>/api/uploadkit</code>. That
          route is a placeholder that answers with a 501 error until you write the forwarding logic. If you want a
          working endpoint today, copy the action above and point the provider&apos;s <code>endpoint</code> at it.
        </p>
      </LandingSection>

      <LandingSection
        id="features"
        eyebrow="What you get"
        title="What UploadKit gives a Remix app"
        lead="Remix and React Router use the React half of the SDK. The typed file-router handler is part of the Next.js package and is not used here."
      >
        <FeatureList
          items={[
            {
              title: 'React upload components',
              description:
                'UploadDropzone, UploadButton and the rest of the more than 40 components from @uploadkitdev/react, with a stylesheet you import once.',
            },
            {
              title: 'Presigned direct-to-storage uploads',
              description:
                'The action only signs. File bytes go from the browser to your bucket, which avoids server body limits.',
            },
            {
              title: 'Bring your own storage',
              description:
                'The template signs against your R2 or S3-compatible bucket with credentials from process.env.',
            },
            {
              title: 'Works with revalidation',
              description:
                'After a successful upload, call useRevalidator().revalidate() to refresh your loaders, as shown in the tutorial.',
            },
          ]}
        />
        <p>
          Our tutorial builds the same flow by hand with the AWS SDK, zod validation, per-user object keys and a
          file list loader. Read{' '}
          <Link href="/blog/file-uploads-remix-react-router">file uploads in Remix and React Router v7</Link>{' '}
          if you want to understand each piece, or browse the <Link href="/components">component gallery</Link> for
          the UI side.
        </p>
      </LandingSection>

      <LandingSection
        id="limits"
        eyebrow="Limits"
        title="Limits per plan"
        lead={
          <>
            These are the current plan limits. Full details are on the <Link href="/pricing">pricing page</Link>.
          </>
        }
      >
        <FeatureList items={LIMITS} />
      </LandingSection>

      <FaqSection items={FAQ} emitJsonLd={false} />

      <RelatedLinks
        title="Keep reading"
        links={[
          {
            label: 'File uploads in Remix and React Router v7',
            href: '/blog/file-uploads-remix-react-router',
            description: 'The presigned URL pattern, step by step',
          },
          { label: 'Presigned URLs vs server proxy uploads', href: '/blog/presigned-urls-vs-server-proxy' },
          {
            label: 'React setup docs',
            href: 'https://docs.uploadkit.dev/docs/getting-started/react',
            description: 'Provider, components and the headless hook',
          },
          {
            label: 'BYOS docs',
            href: 'https://docs.uploadkit.dev/docs/core-concepts/byos',
            description: 'Use your own S3, R2 or MinIO bucket',
          },
          { label: 'React upload components', href: '/components' },
          { label: 'Bring your own storage', href: '/byos' },
          { label: 'Pricing', href: '/pricing' },
          { label: 'Next.js', href: '/nextjs' },
          { label: 'SvelteKit', href: '/sveltekit' },
          { label: 'Vite and React', href: '/vite' },
        ]}
      />

      <CtaBand
        title="Add uploads to your Remix app"
        secondaryCta={{ label: 'Read the Remix tutorial', href: '/blog/file-uploads-remix-react-router' }}
      />
    </LandingShell>
  )
}
