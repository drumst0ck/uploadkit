import type { Metadata } from 'next'
import {
  LandingShell,
  LandingHero,
  LandingSection,
  CodeBlock,
  ComparisonTable,
  FeatureList,
  FaqSection,
  CtaBand,
  RelatedLinks,
  JsonLd,
} from '@/components/landing'
import { ORGANIZATION, breadcrumbJsonLd, faqJsonLd, graph, type FaqEntry } from '@/lib/json-ld'
import { SIGN_UP_URL } from '@/lib/links'

const TITLE = 'Bring your own storage: S3 & R2 upload SDK — UploadKit'
const DESCRIPTION =
  'Presigned-URL uploads straight to your own S3, Cloudflare R2 or MinIO bucket. Credentials stay on your server and the React components stay the same.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://uploadkit.dev/byos' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://uploadkit.dev/byos',
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
    question: 'Can I use BYOS with a UploadKit Cloud project?',
    answer:
      'No. UploadKit Cloud keys (uk_live_* and uk_test_*) always store files on UploadKit’s managed R2 and CDN, and there is no BYOS toggle in project settings. BYOS is the self-hosted path: you run the handler yourself and pass a storage option. You pick one path per deployment.',
    link: { label: 'BYOS docs', href: 'https://docs.uploadkit.dev/docs/core-concepts/byos' },
  },
  {
    question: 'Do my bucket credentials ever reach the browser?',
    answer:
      'No. The access key and secret live in your server environment. The handler uses them to sign a presigned PUT URL, and the browser only receives that URL.',
  },
  {
    question: 'How long is a presigned URL valid?',
    answer:
      'The default in the handler code is 900 seconds (15 minutes). Each URL is signed for one object key, one content type and one content length.',
  },
  {
    question: 'Which storage providers work?',
    answer:
      'The handler builds an AWS S3 client with an optional custom endpoint, so S3-compatible APIs work. The docs list configs for Cloudflare R2, AWS S3 and MinIO, and also show endpoints for DigitalOcean Spaces, Wasabi and Backblaze B2. The package also exports a Google Cloud Storage factory that points at the S3 interoperability endpoint.',
  },
  {
    question: 'Do I need to change my React components?',
    answer:
      'No. UploadButton, UploadDropzone and useUploadKit behave the same in managed and BYOS mode. Only the server handler changes, and the returned file URLs point at your bucket.',
  },
  {
    question: 'Can I use BYOS outside Next.js?',
    answer:
      'Yes. The package ships adapters for Express, Hono and Fastify that wrap the same handler config, so a storage option works there too.',
    link: {
      label: 'Backend adapters',
      href: 'https://docs.uploadkit.dev/docs/sdk/next/backend-adapters',
    },
  },
]

const R2_ROUTE = `import { createUploadKitHandler } from '@uploadkitdev/next';
import type { FileRouter } from '@uploadkitdev/next';

const router = {
  imageUploader: {
    maxFileSize: '4MB',
    allowedTypes: ['image/*'],
    onUploadComplete: async ({ file }) => {
      console.log('Stored in your R2 bucket:', file.url);
    },
  },
} satisfies FileRouter;

export const { GET, POST } = createUploadKitHandler({
  router,
  storage: {
    endpoint: \`https://\${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com\`,
    region: 'auto',
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    bucket: process.env.R2_BUCKET_NAME!,
  },
});`

const S3_ROUTE = `import { createUploadKitHandler } from '@uploadkitdev/next';
import type { FileRouter } from '@uploadkitdev/next';

const router = {
  documentUploader: {
    maxFileSize: '16MB',
    allowedTypes: ['application/pdf'],
  },
} satisfies FileRouter;

export const { GET, POST } = createUploadKitHandler({
  router,
  storage: {
    region: process.env.AWS_REGION!,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    bucket: process.env.AWS_S3_BUCKET!,
  },
});`

const R2_ENV = `R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your-bucket-name`

const COMPONENT = `<UploadDropzone
  route="imageUploader"
  onUploadComplete={(files) => {
    // files[0].url points to YOUR bucket, not UploadKit's managed storage
    saveToDatabase(files[0].url);
  }}
/>`

const HONO = `import { createHonoHandler } from '@uploadkitdev/next/hono';

app.all('/api/uploadkit/*', createHonoHandler({ router, storage }));`

const FLOW = `Browser                     Your server                     Your S3 bucket
  |  "Upload imageUploader" --->|                                |
  |                             | signs a presigned URL -------->|
  |  <--- presigned URL --------|                                |
  |  PUT file -----------------------------------------------> |
  |  "Done" ------------------->| runs onUploadComplete          |`

export default function ByosPage() {
  return (
    <LandingShell>
      <JsonLd
        data={graph(
          ORGANIZATION,
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'BYOS', path: '/byos' },
          ]),
          faqJsonLd(FAQ),
        )}
      />

      <nav aria-label="Breadcrumb" className="d2-container">
        <ol style={{ display: 'flex', gap: 8, listStyle: 'none', padding: '16px 0 0', margin: 0, fontSize: 13 }}>
          <li>
            <a href="/">Home</a>
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page">BYOS</li>
        </ol>
      </nav>

      <LandingHero
        eyebrow="Bring your own storage"
        title="An S3 upload SDK that writes to your own bucket"
        lead="Run the UploadKit handler in your app, give it your S3, Cloudflare R2 or MinIO credentials, and browsers upload straight to your bucket with presigned URLs. The React components don’t change."
        primaryCta={{ label: 'Read the BYOS docs', href: 'https://docs.uploadkit.dev/docs/core-concepts/byos' }}
        secondaryCta={{ label: 'Start for free', href: SIGN_UP_URL }}
      />

      <LandingSection
        id="how-it-works"
        eyebrow="How it works"
        title="Presigned URLs, signed with your credentials"
        lead="BYOS is the self-hosted path. You run createUploadKitHandler yourself and pass a storage option."
      >
        <p>
          When a user picks a file, the React component asks your route handler for permission to upload. The
          handler checks the request against your file router (including the allowed content types),
          builds an object key from the route name, a random id and a sanitized file name, and signs a presigned
          PUT URL with the AWS S3 client using your credentials. The browser then sends the file directly to the
          bucket. The file bytes never pass through your server.
        </p>
        <p>
          The URL is scoped to one key, one content type and one content length, and the default expiry in the
          handler code is 900 seconds. After the upload, the component calls the handler again and your
          onUploadComplete callback runs on your server. If you want the trade-offs of this design in detail, see{' '}
          <a href="/blog/presigned-urls-vs-server-proxy">presigned URLs vs server proxy uploads</a>.
        </p>
        <CodeBlock code={FLOW} lang="text" title="Upload flow" />
        <p>
          Your <code>accessKeyId</code> and <code>secretAccessKey</code> stay in server-side environment
          variables. Keep the storage config out of client components and out of NEXT_PUBLIC_ variables.
        </p>
      </LandingSection>

      <LandingSection
        id="setup"
        eyebrow="Setup"
        title="Config for Cloudflare R2 and AWS S3"
        lead="Both snippets come from the BYOS docs. Put the route in app/api/uploadkit/route.ts."
      >
        <h3>Cloudflare R2</h3>
        <CodeBlock code={R2_ROUTE} lang="typescript" title="app/api/uploadkit/route.ts" />
        <CodeBlock code={R2_ENV} lang="bash" title=".env.local" />
        <h3>AWS S3</h3>
        <CodeBlock code={S3_ROUTE} lang="typescript" title="app/api/uploadkit/route.ts" />
        <p>
          For S3, the docs recommend an IAM user with <code>s3:PutObject</code>, <code>s3:GetObject</code>,{' '}
          <code>s3:DeleteObject</code> and <code>s3:AbortMultipartUpload</code> on the bucket. Because the
          browser PUTs to the bucket origin, the bucket also needs a CORS rule that allows your site.
        </p>
      </LandingSection>

      <LandingSection
        id="same-components"
        eyebrow="Frontend"
        title="The same React components in both modes"
        lead="Storage config lives in the server handler, so the UI code is identical."
      >
        <p>
          UploadButton, UploadDropzone and useUploadKit work the same whether files go to UploadKit’s managed
          storage or your bucket. The only difference is that the URLs you get back point at your storage.
        </p>
        <CodeBlock code={COMPONENT} lang="tsx" title="Identical in managed and BYOS mode" />
      </LandingSection>

      <LandingSection
        id="backends"
        eyebrow="Backends and providers"
        title="Next.js, Express, Hono and Fastify"
        lead="The adapters wrap the same handler, so the storage option works the same way."
      >
        <FeatureList
          items={[
            {
              title: 'Next.js route handler',
              description: 'createUploadKitHandler from @uploadkitdev/next returns GET and POST for an App Router route.',
            },
            {
              title: 'Express, Hono, Fastify',
              description:
                'createExpressHandler, createHonoHandler and createFastifyHandler are exported from @uploadkitdev/next/express, /hono and /fastify.',
            },
            {
              title: 'S3-compatible providers',
              description:
                'The handler uses the AWS S3 client with an optional custom endpoint. The docs show endpoints for R2, AWS S3, MinIO, DigitalOcean Spaces, Wasabi and Backblaze B2.',
            },
            {
              title: 'Google Cloud Storage factory',
              description:
                'createGCSStorage defaults the endpoint to https://storage.googleapis.com (S3 interoperability). The BYOS docs don’t include a GCS walkthrough, so test it against your own bucket.',
            },
          ]}
        />
        <CodeBlock code={HONO} lang="typescript" title="Hono" />
        <p>
          Here <code>storage</code> is the same object you would pass to createUploadKitHandler. See the{' '}
          <a href="https://docs.uploadkit.dev/docs/sdk/next/backend-adapters">backend adapters docs</a> for
          Express and Fastify.
        </p>
      </LandingSection>

      <LandingSection
        id="managed-vs-byos"
        eyebrow="Choosing"
        title="Managed storage or your own bucket"
        lead="From the BYOS docs. Pick one per deployment."
      >
        <ComparisonTable
          caption="Managed UploadKit Cloud vs self-hosted BYOS"
          usLabel="BYOS (self-hosted)"
          themLabel="Managed (UploadKit Cloud)"
          rows={[
            { feature: 'Storage location', us: 'Your own bucket', them: 'UploadKit’s Cloudflare R2' },
            { feature: 'Setup', us: 'Bucket config, around 10 minutes per the docs', them: 'Works out of the box' },
            { feature: 'Credentials', us: 'You manage IAM or API keys', them: 'UploadKit handles them' },
            { feature: 'CDN', us: 'Configure separately', them: 'Included (Cloudflare)' },
            { feature: 'Cost', us: 'Your provider’s storage rates', them: 'Included in the UploadKit plan' },
            { feature: 'Lock-in', us: 'Switch providers freely', them: 'Files live in UploadKit storage' },
          ]}
        />
        <p>
          Choose managed if you want no infrastructure to run and the Free or Pro limits fit: Free includes 5 GB
          of storage and a 4 MB max file, Pro is $15/mo with 100 GB and 512 MB per file. See{' '}
          <a href="/pricing">pricing</a>. Choose BYOS if you need data to stay in a bucket you control, already
          have storage infrastructure, have compliance requirements, or want your own provider’s rates for
          high-volume storage. For provider prices, read{' '}
          <a href="/blog/s3-vs-r2-vs-backblaze-pricing">S3 vs R2 vs Backblaze B2 pricing</a>.
        </p>
        <p>
          UploadThing stores files on its managed infrastructure (
          <a href="https://uploadthing.com/pricing" rel="noopener noreferrer">
            source
          </a>
          , checked October 2026). The{' '}
          <a href="/vs/uploadthing">UploadKit vs UploadThing</a> page covers the comparison.
        </p>
      </LandingSection>

      <FaqSection items={FAQ} emitJsonLd={false} />

      <RelatedLinks
        links={[
          {
            label: 'BYOS docs',
            href: 'https://docs.uploadkit.dev/docs/core-concepts/byos',
            description: 'Full setup for R2, S3 and MinIO, plus the security model.',
          },
          {
            label: 'BYOS explained',
            href: '/blog/byos-bring-your-own-storage',
            description: 'How the pattern works and how UploadKit ships it.',
          },
          {
            label: 'Presigned URLs vs server proxy',
            href: '/blog/presigned-urls-vs-server-proxy',
            description: 'Why direct-to-bucket uploads are the default.',
          },
          {
            label: 'S3 vs R2 vs Backblaze B2 pricing',
            href: '/blog/s3-vs-r2-vs-backblaze-pricing',
          },
          { label: 'UploadKit vs UploadThing', href: '/vs/uploadthing' },
          { label: 'File uploads for Next.js', href: '/nextjs' },
          {
            label: 'Backend adapters',
            href: 'https://docs.uploadkit.dev/docs/sdk/next/backend-adapters',
            description: 'Express, Hono and Fastify.',
          },
          { label: 'Pricing', href: '/pricing' },
        ]}
      />

      <CtaBand
        title="Keep your bucket, keep your components"
        lead="Same SDK and components whether files land in UploadKit’s storage or in your S3, R2 or MinIO bucket."
      />
    </LandingShell>
  )
}
