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

const TITLE = 'React File Upload Library for Vite | UploadKit'
const DESCRIPTION =
  'Add file uploads to a Vite + React app with UploadKit: UploadDropzone and UploadButton components plus a small Express, Fastify or Hono backend.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://uploadkit.dev/vite' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://uploadkit.dev/vite',
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
    question: 'Can a Vite app upload files without a backend?',
    answer:
      'No. A Vite + React app is a client-only SPA and cannot sign upload requests on its own. The CLI prints a warning saying a server is needed to sign requests, either your own backend or BYOS presigned URLs. Your API key must stay on that server.',
  },
  {
    question: 'Which backend should I use?',
    answer:
      'Any server that exposes the UploadKit endpoint. The docs show Express as the main example, and @uploadkitdev/next ships adapters for Express, Fastify and Hono that reuse the same file router. The starter template also documents a presigned-URL contract (POST filename and contentType, receive url, key and method) for backends of your choice.',
    link: { label: 'Backend adapters', href: 'https://docs.uploadkit.dev/docs/sdk/next/backend-adapters' },
  },
  {
    question: 'Is it safe to put the API key in a VITE_ variable?',
    answer:
      'No. Vite includes every VITE_ variable in the browser bundle, so anyone can read it. Keep the UploadKit API key on your server. The starter template says to use at most a uk_test key in client-exposed variables and never a uk_live key.',
  },
  {
    question: 'What does npx uploadkit init change in a Vite project?',
    answer:
      'It detects vite plus react, wraps the contents of <StrictMode> in src/main.tsx with UploadKitProvider endpoint="/api/uploadkit", adds an env entry and installs @uploadkitdev/react. It requires a <StrictMode> element in main.tsx and stops with an error if it is missing. It creates no server code.',
  },
  {
    question: 'Does it work with React Router or TanStack Router?',
    answer:
      'Yes. Place UploadKitProvider inside your router provider. Documentation for React and Vite says the provider works with React Router or TanStack Router.',
    link: { label: 'React setup docs', href: 'https://docs.uploadkit.dev/docs/getting-started/react' },
  },
  {
    question: 'What does it cost?',
    answer:
      'The free plan includes 5 GB storage, 2 GB bandwidth per month, a 4 MB maximum file size and 1,000 uploads per month. Pro is $15 per month and Team is $35 per month.',
    link: { label: 'See pricing', href: '/pricing' },
  },
]

const SCAFFOLD = 'npx create-uploadkit-app my-app --template vite'
const INSTALL = 'pnpm add @uploadkitdev/core @uploadkitdev/react'
const INSTALL_SERVER = 'pnpm add @uploadkitdev/next hono'

const SERVER = `import { Hono } from 'hono';
import { createHonoHandler } from '@uploadkitdev/next/hono';
import { ourFileRouter } from './file-router';

const app = new Hono();

app.all(
  '/api/uploadkit/*',
  createHonoHandler({
    router: ourFileRouter,
    apiKey: process.env.UPLOADKIT_API_KEY,
  })
);`

const MAIN = `import React from 'react';
import ReactDOM from 'react-dom/client';
import { UploadKitProvider } from '@uploadkitdev/react';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UploadKitProvider endpoint="/api/uploadkit">
      <App />
    </UploadKitProvider>
  </React.StrictMode>,
);`

const COMPONENT = `import { UploadDropzone } from '@uploadkitdev/react';

export function DocumentDropzone() {
  return (
    <UploadDropzone
      route="documentUploader"
      onUploadComplete={(files) => {
        console.log('Documents ready:', files.map((f) => f.url));
      }}
    />
  );
}`

const HOOK = `import { useUploadKit } from '@uploadkitdev/react';

export function CustomUploader() {
  const { upload, progress, isUploading, result, error } = useUploadKit('imageUploader');

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await upload(file);
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleChange} disabled={isUploading} />
      {isUploading && <progress value={progress} max={100} />}
      {result && <p>Uploaded: <a href={result.url}>{result.name}</a></p>}
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}`

const LIMITS = [
  { title: 'Free', description: '5 GB storage, 2 GB bandwidth per month, 4 MB max file, 1,000 uploads per month, 2 projects.' },
  { title: 'Pro — $15/mo', description: '100 GB storage, 200 GB bandwidth, 512 MB max file, 50,000 uploads per month, 10 projects.' },
  { title: 'Team — $35/mo', description: '1 TB storage, 2 TB bandwidth, 5 GB max file, 500,000 uploads per month, 50 projects.' },
  { title: 'Enterprise', description: 'Custom limits. See the pricing page.' },
]

export default function ViteLandingPage() {
  return (
    <LandingShell>
      <JsonLd
        data={graph(
          ORGANIZATION,
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Vite', path: '/vite' },
          ]),
          faqJsonLd(FAQ),
        )}
      />
      <nav className="d2-container" aria-label="Breadcrumb" style={{ paddingTop: 24, fontSize: 14 }}>
        <Link href="/">Home</Link> <span aria-hidden="true">›</span> <span aria-current="page">Vite</span>
      </nav>

      <LandingHero
        eyebrow="Vite and React"
        title="A React file upload library for Vite"
        lead="Drop UploadKit components into a Vite + React app and point them at a small backend that signs uploads. The React package gives you the dropzone, button and headless hook. Your server holds the API key, because a Vite SPA cannot keep a secret."
        secondaryCta={{ label: 'React setup docs', href: 'https://docs.uploadkit.dev/docs/getting-started/react' }}
      />

      <LandingSection
        id="quickstart"
        eyebrow="Quickstart"
        title="Set up uploads in a Vite + React app"
        lead="This follows the React / Vite guide in the docs. You need two pieces: the provider in the SPA and an endpoint on a server."
      >
        <h3>1. Install</h3>
        <p>
          To start from a project, run <code>npx create-uploadkit-app my-app --template vite</code>. It is a pure
          SPA with no server code, so you still add the backend below.
        </p>
        <CodeBlock lang="bash" code={SCAFFOLD} />
        <CodeBlock lang="bash" code={INSTALL} />
        <h3>2. Add a backend endpoint</h3>
        <p>
          The docs show an Express handler. UploadKit also ships Hono, Fastify and Express adapters inside{' '}
          <code>@uploadkitdev/next</code>, so a Vite project can reuse the same file router on any of them.
          That package lists <code>next</code> as a peer dependency, so your package manager may print a warning
          on a server that does not use Next.js.
        </p>
        <CodeBlock lang="bash" code={INSTALL_SERVER} />
        <CodeBlock lang="typescript" title="server (Hono adapter)" code={SERVER} />
        <p>
          Keep <code>UPLOADKIT_API_KEY</code> in the server environment. Never put it in a <code>VITE_</code>{' '}
          variable, because Vite inlines those into the browser bundle.
        </p>
        <h3>3. Wrap the app with the provider</h3>
        <CodeBlock lang="tsx" title="src/main.tsx" code={MAIN} />
        <h3>4. Use a component</h3>
        <CodeBlock lang="tsx" title="src/components/DocumentDropzone.tsx" code={COMPONENT} />
      </LandingSection>

      <LandingSection
        id="features"
        eyebrow="What you get"
        title="What UploadKit gives a Vite app"
        lead="The browser side is React. The signing side is your server."
      >
        <FeatureList
          items={[
            {
              title: 'React upload components',
              description:
                'UploadButton, UploadDropzone and the rest of the more than 40 components, plus a headless useUploadKit hook for a custom UI.',
            },
            {
              title: 'Presigned direct-to-storage uploads',
              description:
                'Your endpoint authorises the request and the browser uploads straight to storage.',
            },
            {
              title: 'Bring your own storage',
              description:
                'Run the handler yourself with a storage config for S3, R2 or MinIO, or sign presigned URLs from any backend that follows the template contract.',
            },
            {
              title: 'File routes defined on the server',
              description:
                'The handler takes a file router with size limits, allowed types and callbacks. The docs note that React/Vite apps built on the core client define file routes in the dashboard, and that code-defined routes with TypeScript inference come from the Next.js adapter.',
            },
          ]}
        />
        <h3>Build your own UI with the hook</h3>
        <p>
          Use <code>useUploadKit</code> when you want your own progress bar or file list instead of a prebuilt
          component.
        </p>
        <CodeBlock lang="tsx" title="src/components/CustomUploader.tsx" code={HOOK} />
        <p>
          For the trade-offs of signing URLs on a server, read{' '}
          <Link href="/blog/presigned-urls-vs-server-proxy">presigned URLs vs server proxy uploads</Link>. The{' '}
          <Link href="/blog/file-uploads-remix-react-router">Remix and React Router tutorial</Link> shows the same
          action-plus-client pattern in a framework that has a built-in server, and the{' '}
          <Link href="/components">component gallery</Link> lists what you can render.
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
            label: 'React / Vite setup docs',
            href: 'https://docs.uploadkit.dev/docs/getting-started/react',
            description: 'Provider, components, headless hook and core client',
          },
          {
            label: 'Backend adapters',
            href: 'https://docs.uploadkit.dev/docs/sdk/next/backend-adapters',
            description: 'Express, Fastify and Hono',
          },
          {
            label: 'BYOS docs',
            href: 'https://docs.uploadkit.dev/docs/core-concepts/byos',
            description: 'Use your own S3, R2 or MinIO bucket',
          },
          { label: 'Presigned URLs vs server proxy uploads', href: '/blog/presigned-urls-vs-server-proxy' },
          { label: 'File uploads in Remix and React Router v7', href: '/blog/file-uploads-remix-react-router' },
          { label: 'React upload components', href: '/components' },
          { label: 'Bring your own storage', href: '/byos' },
          { label: 'Pricing', href: '/pricing' },
          { label: 'Next.js', href: '/nextjs' },
          { label: 'SvelteKit', href: '/sveltekit' },
        ]}
      />

      <CtaBand
        title="Add uploads to your Vite app"
        secondaryCta={{ label: 'React setup docs', href: 'https://docs.uploadkit.dev/docs/getting-started/react' }}
      />
    </LandingShell>
  )
}
