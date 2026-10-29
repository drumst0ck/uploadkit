// Home sections in page order. Server components; the only client islands are the box,
// the copy buttons, the dropzone demo, the live SDK components and the pricing plans.

import Link from 'next/link'
import { SIGN_IN_URL, SIGN_UP_URL } from '@/lib/links'
import type { FaqEntry } from '@/lib/json-ld'
import { BoxObject } from './box-object'
import { CopyCommand } from './copy-command'
import { DropzoneDemo } from './dropzone-demo'
import { LiveComponents } from './live-components'

const DOCS = 'https://docs.uploadkit.dev'
const GITHUB = 'https://github.com/drumst0ck/uploadkit'
const NPM = 'https://www.npmjs.com/package'

/** UploadKit mark in white: no gradient (brand decision S2). */
function Mark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--pd-color-accent)" />
      <polygon points="16,7 23,17 9,17" fill="var(--pd-color-text-on-accent)" />
      <rect x="9" y="19" width="14" height="4" rx="1.5" fill="var(--pd-color-text-on-accent)" fillOpacity="0.55" />
    </svg>
  )
}

export function Header() {
  return (
    <header className="top" id="top">
      <Link className="brand" href="/" aria-label="UploadKit home">
        <Mark />
        <span>UploadKit</span>
      </Link>
      <nav className="links" aria-label="Primary">
        <a href={DOCS}>Docs</a>
        <a href="#components">Components</a>
        <a href="#pricing">Pricing</a>
        <a href={SIGN_IN_URL}>Sign in</a>
        <a className="act go" href={SIGN_UP_URL}>Start free</a>
      </nav>
    </header>
  )
}

export function Hero() {
  return (
    <section className="hero" aria-labelledby="h-hero">
      <h1 className="display enter" id="h-hero">Uploads without<br />the plumbing.</h1>
      <div className="col">
        <p className="lead enter" style={{ '--i': 1 } as React.CSSProperties}>
          Open-source file uploads for Next.js, Remix, SvelteKit and Vite.
        </p>
        <p className="enter" style={{ '--i': 2 } as React.CSSProperties}>
          A TypeScript SDK, 40+ React components, and storage on Cloudflare R2 or your own bucket.
        </p>
        <div className="enter" style={{ '--i': 3 } as React.CSSProperties}>
          <CopyCommand command="npm i @uploadkitdev/react @uploadkitdev/next" />
        </div>
        <div className="actions enter" style={{ '--i': 4, marginTop: 24 } as React.CSSProperties}>
          <a className="pd-button pd-button--primary" href={SIGN_UP_URL}>Start free</a>
          <a className="go" href={`${DOCS}/docs/getting-started/quickstart`}>Read the docs</a>
        </div>
        <p className="small soft enter" style={{ '--i': 5 } as React.CSSProperties}>
          Or run <code>npx uploadkit init</code> in an existing app.
        </p>
      </div>
      <BoxObject />
    </section>
  )
}

export function TryIt() {
  return (
    <section className="col" aria-labelledby="h-try">
      <h2 id="h-try" className="rise">Pick a file. Watch it land.</h2>
      <p className="rise">
        This is the real flow, queued, uploading, done, with a CDN URL at the end. It runs in your browser and sends nothing.
      </p>
      <div className="rise" style={{ marginTop: 32 }}>
        <DropzoneDemo />
      </div>
    </section>
  )
}

const ROUTE = `import { createUploadKitHandler } from '@uploadkitdev/next';
import type { FileRouter } from '@uploadkitdev/next';

const router = {
  imageUploader: {
    maxFileSize: '4MB',
    allowedTypes: ['image/*'],
    onUploadComplete: async ({ file }) => {
      console.log(file.url);
    },
  },
} satisfies FileRouter;

export const { GET, POST } = createUploadKitHandler({ router });`

const COMPONENT = `import { UploadDropzone } from '@uploadkitdev/react';

export default function Page() {
  return (
    <UploadDropzone
      route="imageUploader"
      onUploadComplete={(files) => {
        console.log(files.map((f) => f.url));
      }}
    />
  );
}`

export function HowItWorks() {
  return (
    <section aria-labelledby="h-how" id="features">
      <div className="col">
        <h2 id="h-how" className="rise">A route and a component.</h2>
        <p className="rise">
          Declare what you accept in a route handler. Then drop a component anywhere. Your API key stays on the server; the
          provider talks to your own endpoint.
        </p>
      </div>
      <div className="code2 rise">
        <div>
          <pre tabIndex={0} aria-label="Route handler"><code>{ROUTE}</code></pre>
          <p className="cap">app/api/uploadkit/route.ts</p>
        </div>
        <div>
          <pre tabIndex={0} aria-label="Component"><code>{COMPONENT}</code></pre>
          <p className="cap">app/page.tsx</p>
        </div>
      </div>
      <div className="col rise" style={{ marginTop: 48 }}>
        <p>
          Step-by-step guides for <Link href="/nextjs">Next.js</Link>, <Link href="/remix">Remix</Link>,{' '}
          <Link href="/sveltekit">SvelteKit</Link> and <Link href="/vite">Vite</Link>.
        </p>
        <p className="soft small">
          Packages on npm: <a href={`${NPM}/@uploadkitdev/react`}>react</a>, <a href={`${NPM}/@uploadkitdev/next`}>next</a> and{' '}
          <a href={`${NPM}/@uploadkitdev/core`}>core</a>. Not on React? Use the{' '}
          <a href={`${DOCS}/docs/api-reference/rest-api`}>REST API</a>, or start from the{' '}
          <a href={`${GITHUB}/tree/master/examples`}>examples on GitHub</a>.
        </p>
      </div>
    </section>
  )
}

const THEME = `/* The theme: the SDK's public variables only. */
.sdk-stage {
  --uk-primary: #ffffff;   --uk-primary-hover: #e5e5e5;
  --uk-bg: #0a0a0a;        --uk-bg-secondary: #171717;
  --uk-border: #2e2e2e;    --uk-text: #ededed;
  --uk-text-secondary: #a1a1a1;
  --uk-success: #62c073;   --uk-error: #ff6369;
  --uk-radius: 6px;        --uk-font: Geist, system-ui, sans-serif;
}
/* A few SDK buttons hardcode white text, so a white primary needs this. */
.sdk-stage .uk-button { color: #000; }`

export function Components() {
  return (
    <section aria-labelledby="h-comp" id="components">
      <div className="col">
        <h2 id="h-comp" className="rise">Components for every UI.</h2>
        <p className="rise">
          40+ React components: dropzones, buttons, progress bars, file lists, galleries, avatars, modals. Each reads the same
          route, so changing the look changes one import.
        </p>
        <p className="rise soft small">
          Browse the <Link href="/components">component catalog</Link>, or read the docs for the{' '}
          <a href={`${DOCS}/docs/sdk/react/upload-dropzone-glass`}>glass dropzone</a>.
        </p>
      </div>
      <div className="wide sdk-stage" id="uk-live" data-ui>
        <LiveComponents />
      </div>
      <div className="col rise" style={{ marginTop: 64 }}>
        <pre tabIndex={0} aria-label="Theme override"><code>{THEME}</code></pre>
        <p className="cap">Live components from @uploadkitdev/react, themed with CSS variables. Uploads here stay in this page.</p>
      </div>
    </section>
  )
}

const BYOS = `import { createR2Storage } from '@uploadkitdev/next/byos';

export const { GET, POST } = createUploadKitHandler({
  router,
  storage: createR2Storage({
    accountId:       process.env.R2_ACCOUNT_ID!,
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET!,
    bucket:          process.env.R2_BUCKET!,
  }),
});`

export function Byos() {
  return (
    <section aria-labelledby="h-byos">
      <div className="cmp">
        <div className="stack rise">
          <h2 id="h-byos">Our bucket or yours.</h2>
          <p>Managed storage on Cloudflare R2 works as soon as you add an API key. Nothing to configure, no egress to pay for.</p>
          <p>
            Prefer your own? Point the storage option at an S3, R2 or MinIO bucket and run the handler yourself. Same
            components, same route.
          </p>
          <p>
            <Link className="go" href="/byos">How bring your own storage works</Link>
          </p>
          <p className="soft small">
            Setup is in the <a href={`${DOCS}/docs/core-concepts/byos`}>BYOS docs</a>.
          </p>
        </div>
        <div className="rise">
          <pre tabIndex={0} aria-label="Bring your own storage with R2"><code>{BYOS}</code></pre>
          <p className="cap">Bring your own storage, R2</p>
        </div>
      </div>
    </section>
  )
}

const VARIANTS = [
  { w: 160, ratio: '16/9', name: 'AVIF', note: '800w · q75' },
  { w: 128, ratio: '16/9', name: 'WebP', note: '640×360 · cover' },
  { w: 100, ratio: '1', name: 'PNG', note: '500×500 · contain' },
]

export function ImageTransforms() {
  return (
    <section aria-labelledby="h-img">
      <div className="cmp">
        <div className="stack rise">
          <h2 id="h-img">One original. Every screen.</h2>
          <p>
            Resize, crop, optimize and convert images at the edge. Signed URLs keep your originals private; Cloudflare caches
            each variant close to your users. Available on paid plans.
          </p>
          <pre tabIndex={0} aria-label="Image transform call"><code>{`await uploadkit.transformImage(file.key, {
  width: 800, fit: 'cover',
  format: 'auto', quality: 75
})`}</code></pre>
          <p>
            <a className="go" href={`${DOCS}/docs/core-concepts/image-transformations`}>Explore image transforms</a>
          </p>
        </div>
        <div className="rise">
          <div data-ui className="tf" role="group" aria-label="One original and three generated variants, drawn to their aspect ratios">
            <div className="tf-item">
              <div className="tf-box o" style={{ width: 260, aspectRatio: '16/9' }} />
              <p>original</p>
            </div>
            {VARIANTS.map((v) => (
              <div className="tf-item" key={v.name}>
                <div className="tf-box" style={{ width: v.w, aspectRatio: v.ratio }} />
                <p>{v.name}<br /><span>{v.note}</span></p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

const MCP_CAPS = [
  'Knows all 40+ components by name',
  'Scaffolds the Next.js route handler',
  'Wires the UploadKitProvider',
  'Generates BYOS config (S3, R2, GCS, B2)',
  'Creates signed image variants with a configured live key',
]

export function Mcp() {
  return (
    <section className="col" aria-labelledby="h-mcp" id="mcp">
      <h2 id="h-mcp" className="rise">Your AI already knows UploadKit.</h2>
      <p className="rise">The UploadKit MCP server gives Claude Code, Cursor, Windsurf, Zed and Continue the whole SDK.</p>
      <div className="rise"><CopyCommand command="npx -y @uploadkitdev/mcp" /></div>
      <ul className="caps rise">
        {MCP_CAPS.map((c) => <li key={c}>{c}</li>)}
      </ul>
      <p className="rise soft small">
        <a href={`${DOCS}/docs/guides/mcp`}>MCP setup guide</a> · <a href={`${NPM}/@uploadkitdev/mcp`}>@uploadkitdev/mcp on npm</a>
      </p>
    </section>
  )
}

export function Faq({ items }: { items: FaqEntry[] }) {
  return (
    <section className="col faq" aria-labelledby="h-faq" id="faq">
      <h2 id="h-faq" className="rise">Questions, answered.</h2>
      <div style={{ marginTop: 40 }}>
        {items.map((item) => (
          <details open className="rise" key={item.question}>
            <summary>{item.question}</summary>
            <p>
              {item.answer}
              {item.link && (
                <>
                  {' '}
                  {item.link.href.startsWith('/') ? <Link href={item.link.href}>{item.link.label}</Link> : <a href={item.link.href}>{item.link.label}</a>}
                </>
              )}
            </p>
          </details>
        ))}
      </div>
    </section>
  )
}

export function Closing() {
  return (
    <section className="col close" aria-labelledby="h-close">
      <h2 id="h-close" className="display rise">Five gigabytes<br />free, forever.</h2>
      <p className="rise">Scaffold a working app in one command: <code>npx create-uploadkit-app my-app</code></p>
      <div className="actions rise" style={{ marginTop: 32 }}>
        <a className="pd-button pd-button--primary" href={SIGN_UP_URL}>Start free</a>
        <a className="go" href={`${DOCS}/docs/getting-started/quickstart`}>Read the docs</a>
      </div>
    </section>
  )
}

const FOOT = [
  { label: 'Docs', href: DOCS },
  { label: 'GitHub', href: GITHUB },
  { label: 'Status', href: '/status' },
  { label: 'Blog', href: '/blog' },
  { label: 'Changelog', href: '/changelog' },
  { label: 'Dashboard', href: 'https://app.uploadkit.dev' },
  { label: 'Privacy', href: 'https://app.uploadkit.dev/privacy' },
  { label: 'Terms', href: 'https://app.uploadkit.dev/terms' },
  { label: 'Contact', href: 'mailto:support@uploadkit.dev' },
]

export function Footer() {
  return (
    <footer className="foot">
      <span>UploadKit is open source under the MIT license.</span>
      {FOOT.map((l) => (l.href.startsWith('/') ? <Link key={l.label} href={l.href}>{l.label}</Link> : <a key={l.label} href={l.href}>{l.label}</a>))}
    </footer>
  )
}
