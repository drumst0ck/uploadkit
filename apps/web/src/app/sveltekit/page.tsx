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

const TITLE = 'SvelteKit File Upload with Presigned URLs'
const DESCRIPTION =
  'Upload files from SvelteKit to Cloudflare R2 or S3 with presigned PUT URLs and a +server.ts endpoint. No Svelte components yet; see what works today.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://uploadkit.dev/sveltekit' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://uploadkit.dev/sveltekit',
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
    question: 'Are there UploadKit components for Svelte?',
    answer:
      'Not yet. The UploadKit components are React components. For SvelteKit the starter template builds its own small Svelte 5 page and uses a server endpoint that returns a presigned URL. The repository marks full Svelte components as a future release.',
  },
  {
    question: 'What does npx uploadkit init add to a SvelteKit project?',
    answer:
      'It detects @sveltejs/kit, installs only @uploadkitdev/core, creates src/routes/api/uploadkit/[...uploadkit]/+server.ts and src/lib/uploadkit.ts, and adds UPLOADKIT_API_KEY to .env. It does not touch any .svelte file and it adds no React provider. Treat the generated files as a starting point and verify them before relying on them.',
  },
  {
    question: 'Can I use the React components inside SvelteKit?',
    answer:
      'The create-uploadkit-app SvelteKit template contains a placeholder dropzone file that wraps the React components, labelled as a stand-in until Svelte components ship. It is not used by the template page, which uses plain Svelte instead. Mixing React into a Svelte app needs extra setup that UploadKit does not provide.',
  },
  {
    question: 'Do uploads go through my SvelteKit server?',
    answer:
      'No. The +server.ts endpoint only returns a presigned PUT URL. The browser then sends the file straight to your bucket with fetch. The content type must be the same on the signing call and the PUT, otherwise the storage provider answers 403.',
    link: { label: 'Presigned URLs vs server proxy', href: '/blog/presigned-urls-vs-server-proxy' },
  },
  {
    question: 'Which storage can I use?',
    answer:
      'The template signs against Cloudflare R2 and the same code works with any S3-compatible bucket through the AWS SDK. For the managed option, sign up for an UploadKit project.',
    link: { label: 'BYOS docs', href: 'https://docs.uploadkit.dev/docs/core-concepts/byos' },
  },
  {
    question: 'What does it cost?',
    answer:
      'The free plan includes 5 GB storage, 2 GB bandwidth per month, a 4 MB maximum file size and 1,000 uploads per month. Pro is $15 per month and Team is $35 per month.',
    link: { label: 'See pricing', href: '/pricing' },
  },
]

const SCAFFOLD = 'npx create-uploadkit-app my-app --template sveltekit'

const SERVER = `import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const POST: RequestHandler = async ({ request }) => {
  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw.filename !== 'string' || typeof raw.contentType !== 'string') {
    return json({ error: 'Body must be { filename: string, contentType: string }' }, { status: 400 });
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: \`https://\${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com\`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  const key = \`\${crypto.randomUUID()}-\${raw.filename}\`;

  // ContentType MUST be set on both sign AND the client PUT — mismatch → 403.
  const url = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      ContentType: raw.contentType,
    }),
    { expiresIn: 60 * 5 },
  );

  return json({ url, key, method: 'PUT' as const });
};`

const PAGE = `<script lang="ts">
  let file = $state<File | null>(null);
  let status = $state<'idle' | 'uploading' | 'done' | 'error'>('idle');

  async function upload() {
    if (!file) return;
    status = 'uploading';
    try {
      const signResponse = await fetch('/api/sign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream' }),
      });
      const sign = await signResponse.json();
      if ('error' in sign) throw new Error(sign.error);

      const put = await fetch(sign.url, {
        method: 'PUT',
        body: file,
        headers: { 'content-type': file.type || 'application/octet-stream' },
      });
      if (!put.ok) throw new Error(\`Upload failed: \${put.status} \${put.statusText}\`);
      status = 'done';
    } catch {
      status = 'error';
    }
  }
</script>

<input type="file" onchange={(e) => (file = e.currentTarget.files?.[0] ?? null)} />
<button type="button" onclick={upload} disabled={!file || status === 'uploading'}>Upload</button>`

const ENV = `R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=`

const LIMITS = [
  { title: 'Free', description: '5 GB storage, 2 GB bandwidth per month, 4 MB max file, 1,000 uploads per month, 2 projects.' },
  { title: 'Pro — $15/mo', description: '100 GB storage, 200 GB bandwidth, 512 MB max file, 50,000 uploads per month, 10 projects.' },
  { title: 'Team — $35/mo', description: '1 TB storage, 2 TB bandwidth, 5 GB max file, 500,000 uploads per month, 50 projects.' },
  { title: 'Enterprise', description: 'Custom limits. See the pricing page.' },
]

export default function SvelteKitLandingPage() {
  return (
    <LandingShell>
      <JsonLd
        data={graph(
          ORGANIZATION,
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'SvelteKit', path: '/sveltekit' },
          ]),
          faqJsonLd(FAQ),
        )}
      />
      <nav className="d2-container" aria-label="Breadcrumb" style={{ paddingTop: 24, fontSize: 14 }}>
        <Link href="/">Home</Link> <span aria-hidden="true">›</span> <span aria-current="page">SvelteKit</span>
      </nav>

      <LandingHero
        eyebrow="SvelteKit"
        title="File uploads for SvelteKit"
        lead="Upload files from SvelteKit directly to your storage bucket. A +server.ts endpoint signs a presigned PUT URL and the browser sends the file to R2 or S3. UploadKit has no Svelte components yet, so this page shows the server-side flow that works today."
        secondaryCta={{ label: 'Read the SvelteKit tutorial', href: '/blog/file-uploads-sveltekit' }}
      />

      <LandingSection
        id="support"
        eyebrow="Support today"
        title="What is supported for SvelteKit"
        lead="UploadKit does not ship Svelte components. The UI components in @uploadkitdev/react are React components."
      >
        <p>
          For SvelteKit you get a server route and a framework-agnostic client. The CLI&apos;s SvelteKit setup
          installs <code>@uploadkitdev/core</code> and creates server files only. The starter template goes one
          step further and shows the raw presigned URL flow with no UploadKit package at all: a{' '}
          <code>+server.ts</code> endpoint signs, and a Svelte 5 page uploads with <code>fetch</code>. Full Svelte
          components are listed in the repository as a future release, with no date.
        </p>
      </LandingSection>

      <LandingSection
        id="quickstart"
        eyebrow="Quickstart"
        title="Presigned uploads in a SvelteKit app"
        lead="These files come from the create-uploadkit-app SvelteKit template."
      >
        <h3>1. Scaffold the app</h3>
        <CodeBlock lang="bash" code={SCAFFOLD} />
        <h3>2. Add storage credentials</h3>
        <CodeBlock lang="bash" title=".env.local" code={ENV} />
        <h3>3. Sign uploads in a server route</h3>
        <p>
          The endpoint reads credentials from <code>$env/dynamic/private</code>, so they stay on the server. In the
          template it lives at <code>src/routes/api/sign/+server.ts</code>.
        </p>
        <CodeBlock lang="typescript" title="src/routes/api/sign/+server.ts" code={SERVER} />
        <h3>4. Upload from the page</h3>
        <p>
          The page requests a URL, then sends the file to storage with a PUT that uses the same content type you
          signed.
        </p>
        <CodeBlock lang="text" title="src/routes/+page.svelte (condensed)" code={PAGE} />
      </LandingSection>

      <LandingSection
        id="features"
        eyebrow="What you get"
        title="What this setup gives you"
        lead="Same primitives as the rest of the SDK, without a UI layer on the Svelte side."
      >
        <FeatureList
          items={[
            {
              title: 'Presigned direct-to-storage uploads',
              description:
                'The SvelteKit server never handles file bytes. It signs a short-lived URL and the browser uploads straight to the bucket.',
            },
            {
              title: 'Bring your own storage',
              description:
                'Cloudflare R2 in the template, and the same AWS SDK code works against other S3-compatible buckets.',
            },
            {
              title: 'Framework-agnostic core',
              description:
                '@uploadkitdev/core has no React dependency, so it can be used from any JavaScript environment.',
            },
            {
              title: 'React components, if you need them',
              description:
                'Teams that already render React islands can use @uploadkitdev/react. UploadKit does not provide a Svelte wrapper.',
            },
          ]}
        />
        <p>
          The tutorial <Link href="/blog/file-uploads-sveltekit">file uploads in SvelteKit with presigned URLs</Link>{' '}
          adds <code>hooks.server.ts</code> authentication, zod validation and a Svelte 5 dropzone on top of this
          flow. If you are choosing between a signed URL and a proxy, read{' '}
          <Link href="/blog/presigned-urls-vs-server-proxy">presigned URLs vs server proxy uploads</Link>.
        </p>
      </LandingSection>

      <LandingSection
        id="limits"
        eyebrow="Limits"
        title="Limits per plan"
        lead={
          <>
            These apply when you use UploadKit managed storage. Full details are on the{' '}
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
            label: 'File uploads in SvelteKit with presigned URLs',
            href: '/blog/file-uploads-sveltekit',
            description: 'Svelte 5 dropzone, hooks.server.ts auth and zod',
          },
          { label: 'Presigned URLs vs server proxy uploads', href: '/blog/presigned-urls-vs-server-proxy' },
          {
            label: 'BYOS docs',
            href: 'https://docs.uploadkit.dev/docs/core-concepts/byos',
            description: 'Use your own S3, R2 or MinIO bucket',
          },
          { label: 'Bring your own storage', href: '/byos' },
          { label: 'React upload components', href: '/components' },
          { label: 'Pricing', href: '/pricing' },
          { label: 'Next.js', href: '/nextjs' },
          { label: 'Remix and React Router', href: '/remix' },
          { label: 'Vite and React', href: '/vite' },
        ]}
      />

      <CtaBand
        title="Add uploads to your SvelteKit app"
        secondaryCta={{ label: 'Read the SvelteKit tutorial', href: '/blog/file-uploads-sveltekit' }}
      />
    </LandingShell>
  )
}
