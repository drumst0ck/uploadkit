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

const TITLE = 'Next.js File Upload: Components & S3 Direct Uploads'
const DESCRIPTION =
  'Add file uploads to a Next.js App Router app with @uploadkitdev/next: typed file routes, React upload components, presigned direct-to-storage uploads, BYOS.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://uploadkit.dev/nextjs' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://uploadkit.dev/nextjs',
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
    question: 'Does UploadKit work with the Next.js Pages Router?',
    answer:
      'No. The SDK and the CLI target the App Router. When uploadkit init finds a Pages Router project (pages/_app) without an app directory, it stops with the message "Pages Router not supported — migrate to App Router". The docs list Next.js 14 or later with the App Router as the prerequisite.',
    link: { label: 'Next.js setup guide', href: 'https://docs.uploadkit.dev/docs/getting-started/nextjs' },
  },
  {
    question: 'How do I upload to S3 from Next.js with UploadKit?',
    answer:
      'Pass a storage object (bucket, region, accessKeyId, secretAccessKey, and an endpoint for non-AWS providers) to createUploadKitHandler. Files go to your bucket and the React components stay the same. BYOS works with any S3-compatible storage; the docs show Cloudflare R2, AWS S3 and MinIO.',
    link: { label: 'BYOS guide', href: 'https://docs.uploadkit.dev/docs/core-concepts/byos' },
  },
  {
    question: 'Do uploads pass through my Next.js server?',
    answer:
      'No for the file bytes. Your route handler authorises the upload and the browser sends the file straight to storage with a presigned URL, so the file bytes never count against the request body limit of your hosting platform. See the post on presigned URLs versus server proxy uploads for the trade-offs.',
    link: { label: 'Presigned URLs vs server proxy', href: '/blog/presigned-urls-vs-server-proxy' },
  },
  {
    question: 'Is the route typed end to end?',
    answer:
      'Yes. Define the router with satisfies FileRouter and pass its type to generateReactHelpers. The route prop of UploadButton, UploadDropzone and UploadModal is then typed to your route names.',
  },
  {
    question: 'Which components do I get?',
    answer:
      'UploadButton, UploadDropzone and UploadModal are covered in the Next.js guide, and the SDK exports more than 40 React components in total. Each one reads the endpoint from UploadKitProvider.',
    link: { label: 'Browse components', href: '/components' },
  },
  {
    question: 'What does it cost?',
    answer:
      'The free plan includes 5 GB storage, 2 GB bandwidth per month, a 4 MB maximum file size, 1,000 uploads per month and 2 projects. Pro is $15 per month and Team is $35 per month. With self-hosted BYOS your files and storage bill stay with your own provider.',
    link: { label: 'See pricing', href: '/pricing' },
  },
]

const INSTALL = 'pnpm add @uploadkitdev/next @uploadkitdev/react'

const ROUTE = `import { createUploadKitHandler } from '@uploadkitdev/next';
import type { FileRouter } from '@uploadkitdev/next';
import { auth } from '@/lib/auth'; // your Auth.js or Clerk auth helper

const router = {
  // Accept profile images up to 4 MB
  imageUploader: {
    maxFileSize: '4MB',
    allowedTypes: ['image/*'],
    onUploadComplete: async ({ file, metadata }) => {
      console.log('Image uploaded by user:', metadata.userId, file.url);
    },
  },

  // PDF / Word documents up to 16 MB, max 5 files at once
  documentUploader: {
    maxFileSize: '16MB',
    maxFileCount: 5,
    allowedTypes: ['application/pdf', 'application/msword'],
    middleware: async ({ req }) => {
      const session = await auth();
      if (!session?.user?.id) {
        throw new Error('Unauthorized');
      }
      // Anything returned here is passed to onUploadComplete as \`metadata\`
      return { userId: session.user.id };
    },
    onUploadComplete: async ({ file, metadata }) => {
      console.log('Document uploaded:', file.key, 'by', metadata.userId);
    },
  },
} satisfies FileRouter;

export const { GET, POST } = createUploadKitHandler({ router });`

const ENV = `# Server-side only. Never prefix this with NEXT_PUBLIC_
UPLOADKIT_API_KEY=uk_live_xxxxxxxxxxxxxxxxxxxxx`

const LAYOUT = `import { UploadKitProvider } from '@uploadkitdev/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <UploadKitProvider endpoint="/api/uploadkit">
          {children}
        </UploadKitProvider>
      </body>
    </html>
  );
}`

const PAGE = `import { UploadDropzone } from '@uploadkitdev/react';

export default function DocumentsPage() {
  return (
    <UploadDropzone
      route="documentUploader"
      onUploadComplete={(files) => {
        console.log('Documents uploaded:', files);
      }}
    />
  );
}`

const TYPED = `import { generateReactHelpers } from '@uploadkitdev/react';
import type { FileRouter } from '@/app/api/uploadkit/route';

// Re-export typed components — route prop is now typed to your route names
export const { UploadButton, UploadDropzone, UploadModal, useUploadKit } =
  generateReactHelpers<FileRouter>();`

const BYOS = `export const { GET, POST } = createUploadKitHandler({
  router,
  storage: {
    endpoint: \`https://\${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com\`,
    region: 'auto',
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    bucket: process.env.R2_BUCKET_NAME!,
  },
});`

const LIMITS = [
  { title: 'Free', description: '5 GB storage, 2 GB bandwidth per month, 4 MB max file, 1,000 uploads per month, 2 projects.' },
  { title: 'Pro — $15/mo', description: '100 GB storage, 200 GB bandwidth, 512 MB max file, 50,000 uploads per month, 10 projects.' },
  { title: 'Team — $35/mo', description: '1 TB storage, 2 TB bandwidth, 5 GB max file, 500,000 uploads per month, 50 projects.' },
  { title: 'Enterprise', description: 'Custom limits. See the pricing page.' },
]

export default function NextjsLandingPage() {
  return (
    <LandingShell>
      <JsonLd
        data={graph(
          ORGANIZATION,
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Next.js', path: '/nextjs' },
          ]),
          faqJsonLd(FAQ),
        )}
      />
      <nav className="crumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link> <span aria-hidden="true">›</span> <span aria-current="page">Next.js</span>
      </nav>

      <LandingHero
        title="File uploads for Next.js"
        lead="UploadKit is an upload SDK for the Next.js App Router. You define typed file routes in a Route Handler, drop in React upload components, and the browser sends files directly to storage with presigned URLs. Use UploadKit's managed storage or your own S3-compatible bucket."
        secondaryCta={{ label: 'Next.js docs', href: 'https://docs.uploadkit.dev/docs/getting-started/nextjs' }}
      />

      <LandingSection
        id="quickstart"
        title="Set up uploads in a Next.js App Router project"
        lead="This follows the Next.js getting-started guide. It needs Next.js 14 or later and React 18 or later. To start from a ready project, run npx create-uploadkit-app my-app --template next. To add UploadKit to an existing project, run npx uploadkit init."
      >
        <h3>1. Install</h3>
        <CodeBlock lang="bash" code={INSTALL} />
        <h3>2. Define the file router</h3>
        <p>
          Every upload category lives in one Route Handler with its size limit, allowed types and server-side
          logic. The middleware runs on your server before an upload is authorised, and whatever it returns is
          passed to onUploadComplete as typed metadata.
        </p>
        <CodeBlock lang="typescript" title="app/api/uploadkit/route.ts" code={ROUTE} />
        <h3>3. Add the API key</h3>
        <CodeBlock lang="bash" title=".env.local" code={ENV} />
        <h3>4. Wrap the layout with the provider</h3>
        <CodeBlock lang="tsx" title="app/layout.tsx" code={LAYOUT} />
        <h3>5. Use a component</h3>
        <CodeBlock lang="tsx" title="app/documents/page.tsx" code={PAGE} />
      </LandingSection>

      <LandingSection
        id="features"
        title="What the Next.js SDK includes"
        lead="@uploadkitdev/next is the server half and @uploadkitdev/react is the UI half."
      >
        <FeatureList
          items={[
            {
              title: 'React upload components',
              description:
                'UploadButton, UploadDropzone and UploadModal work in App Router pages, and the SDK exports more than 40 components in total.',
            },
            {
              title: 'Type-safe file routes',
              description:
                'Declare the router with satisfies FileRouter and the route prop on every component is typed to your route names.',
            },
            {
              title: 'Presigned direct-to-storage uploads',
              description:
                'Your handler authorises the request, then the browser uploads the file to storage without proxying the bytes through Next.js.',
            },
            {
              title: 'Bring your own storage',
              description:
                'Pass a storage config to createUploadKitHandler to use Cloudflare R2, AWS S3, MinIO or another S3-compatible bucket. The frontend code does not change.',
            },
          ]}
        />
        <h3>Typed components</h3>
        <p>Bind the components to your router type once, then import them from that module.</p>
        <CodeBlock lang="typescript" title="lib/uploadkit.ts" code={TYPED} />
        <h3>Your own bucket</h3>
        <p>
          In self-hosted BYOS mode you supply either an apiKey or a storage object, not both. Credentials stay in
          your server environment. The managed UploadKit Cloud path and the self-hosted path are chosen per
          deployment, and they are not mixed inside one Cloud project.
        </p>
        <CodeBlock lang="typescript" title="app/api/uploadkit/route.ts (BYOS with Cloudflare R2)" code={BYOS} />
        <p>
          For the details of the S3 side of this flow, read{' '}
          <Link href="/blog/upload-files-cloudflare-r2-nextjs">how to upload files to Cloudflare R2 in Next.js</Link>
          , or the longer walkthrough with sessions and a database in{' '}
          <Link href="/blog/file-uploads-nextjs-authjs-mongodb">file uploads in Next.js with Auth.js and MongoDB</Link>.
        </p>
      </LandingSection>

      <LandingSection
        id="limits"
        title="Limits per plan"
        lead={
          <>
            These are the current plan limits. Full details are on the{' '}
            <Link href="/pricing">pricing page</Link>.
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
            label: 'Next.js docs',
            href: 'https://docs.uploadkit.dev/docs/getting-started/nextjs',
            description: 'Full setup guide for the App Router',
          },
          {
            label: 'BYOS docs',
            href: 'https://docs.uploadkit.dev/docs/core-concepts/byos',
            description: 'Use your own S3, R2 or MinIO bucket',
          },
          {
            label: 'Backend adapters',
            href: 'https://docs.uploadkit.dev/docs/sdk/next/backend-adapters',
            description: 'Express, Fastify and Hono with the same file router',
          },
          { label: 'Upload files to Cloudflare R2 in Next.js', href: '/blog/upload-files-cloudflare-r2-nextjs' },
          { label: 'File uploads in Next.js with Auth.js and MongoDB', href: '/blog/file-uploads-nextjs-authjs-mongodb' },
          { label: 'React upload components', href: '/components' },
          { label: 'Bring your own storage', href: '/byos' },
          { label: 'Pricing', href: '/pricing' },
          { label: 'UploadKit vs UploadThing', href: '/vs/uploadthing' },
          { label: 'Vite and React', href: '/vite' },
        ]}
      />

      <CtaBand
        title="Add uploads to your Next.js app"
        secondaryCta={{ label: 'Next.js docs', href: 'https://docs.uploadkit.dev/docs/getting-started/nextjs' }}
      />
    </LandingShell>
  )
}
