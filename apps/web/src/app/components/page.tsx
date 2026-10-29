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
import { ORGANIZATION, SITE_URL, breadcrumbJsonLd, faqJsonLd, graph, type FaqEntry } from '@/lib/json-ld'
import { SIGN_UP_URL } from '@/lib/links'
import { ComponentShowcase } from '../test/components/component-showcase'
import { CATALOG, COMPONENT_COUNT, DOCS_BASE } from './_catalog'

const TITLE = 'React File Upload Components: 40+ Dropzones | UploadKit'
const DESCRIPTION =
  'React file upload components for dropzones, buttons, progress, galleries and croppers. Install @uploadkitdev/react or add one with the CLI.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/components` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/components`,
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
    question: 'Is there a React dropzone component in UploadKit?',
    answer:
      'Yes. UploadDropzone is a drag-and-drop zone with multi-file support, per-file progress bars and auto-dismissing error toasts. Six styled variants (Glass, Aurora, Terminal, Brutal, Minimal, Neon) and a Blueprint variant ship in the same package.',
    link: { label: 'UploadDropzone docs', href: `${DOCS_BASE}upload-dropzone` },
  },
  {
    question: 'Is UploadKit a shadcn file upload component?',
    answer:
      'UploadKit does not publish a shadcn registry, so shadcn add does not install it. You install @uploadkitdev/react from npm. The CLI command npx uploadkit add <alias> adds an import from @uploadkitdev/react and inserts a JSX snippet into a file you choose. It does not copy component source into your project.',
  },
  {
    question: 'How do I theme the components?',
    answer:
      'Import @uploadkitdev/react/styles.css once and override the --uk-* CSS variables, for example --uk-primary, --uk-bg and --uk-radius. Dark mode follows prefers-color-scheme, or a data-theme="dark" attribute or .dark class. For Tailwind, withUk adds uk-* variants such as uk-uploading and uk-dragging.',
    link: { label: 'Theming docs', href: 'https://docs.uploadkit.dev/docs/sdk/react/theming' },
  },
  {
    question: 'Do the components work without Next.js?',
    answer:
      'Yes. In a Vite or other React app you wrap the tree in UploadKitProvider with an endpoint that points at your own backend route, which holds the API key. The Next.js adapter adds code-defined file routes with TypeScript inference.',
    link: { label: 'React / Vite setup', href: 'https://docs.uploadkit.dev/docs/getting-started/react' },
  },
  {
    question: 'Do I need Motion installed?',
    answer:
      'Several components check for the Motion library at runtime and use it for spring animations when it is available. Without it they fall back to CSS keyframes or transitions, as described in each component source.',
  },
  {
    question: 'How big can an uploaded file be?',
    answer:
      'The limit comes from your plan: 4 MB per file on Free, 512 MB on Pro and 5 GB on Team. The maxSize prop on a component only validates in the browser, and the server enforces the real limit.',
    link: { label: 'See pricing', href: '/pricing' },
  },
]

const INSTALL = `pnpm add @uploadkitdev/core @uploadkitdev/react`

const PROVIDER = `import { UploadKitProvider } from '@uploadkitdev/react';

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

const USAGE = `import { UploadButton, UploadDropzone } from '@uploadkitdev/react';

export function Uploads() {
  return (
    <>
      <UploadButton
        route="imageUploader"
        onUploadComplete={(files) => {
          console.log('Files uploaded:', files.map((f) => f.url));
        }}
        onUploadError={(error) => {
          alert(\`Upload failed: \${error.message}\`);
        }}
      />
      <UploadDropzone
        route="documentUploader"
        onUploadComplete={(files) => {
          console.log('Documents uploaded:', files);
        }}
      />
    </>
  );
}`

const CSS_SNIPPET = `/* once, in your app entry */
import '@uploadkitdev/react/styles.css';

/* override tokens globally or on any ancestor */
:root {
  --uk-primary: #0070f3;
  --uk-radius: 12px;
}`

const TAILWIND = `import { withUk } from '@uploadkitdev/react/tailwind';

export default withUk({ content: ['./src/**/*.tsx'] });`

const CLI = `npx uploadkit add dropzone
npx uploadkit add button-shimmer --target app/upload/page.tsx --yes`

export default function ComponentsPage() {
  return (
    <LandingShell>
      <JsonLd
        data={graph(
          ORGANIZATION,
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Components', path: '/components' },
          ]),
          faqJsonLd(FAQ),
        )}
      />
      <LandingHero
        eyebrow="@uploadkitdev/react"
        title="React file upload components"
        lead={`${COMPONENT_COUNT} components for React: dropzones, upload buttons, progress indicators, galleries and croppers. They share one provider and one upload client, so you pick the look and keep the same props.`}
        primaryCta={{ label: 'Start for free', href: SIGN_UP_URL }}
        secondaryCta={{ label: 'Component docs', href: 'https://docs.uploadkit.dev/docs/sdk/react/installation' }}
      />

      <nav aria-label="Breadcrumb" className="d2-container">
        <Link href="/">Home</Link> › <span aria-current="page">Components</span>
      </nav>

      <LandingSection
        id="what-you-get"
        eyebrow="Overview"
        title="A React dropzone and file upload component library"
        lead="@uploadkitdev/react exports every component below as a named export. Each one uploads through the UploadKitProvider you mount once."
      >
        <p>
          Most upload UIs repeat the same work: pick or drop files, validate type and size, show progress,
          surface errors, then hand back URLs. UploadKit keeps that logic in one client and ships the
          interface as components, so a React dropzone, a button and a progress ring all behave the same
          way. Components take a <code>route</code> that names a file route, plus optional{' '}
          <code>accept</code>, <code>maxSize</code>, <code>metadata</code>, <code>onUploadComplete</code>{' '}
          and <code>onUploadError</code> props.
        </p>
        <p>
          The package also exports the <code>useUploadKit</code> hook for building your own UI, a{' '}
          <code>generateReactHelpers</code> helper, and the <code>withUk</code> Tailwind plugin. The
          interactive gallery further down renders the components so you can try them.
        </p>
        <FeatureList
          items={[
            { title: 'One provider', description: 'UploadKitProvider takes an endpoint that points at your own backend route, so the API key stays on the server.' },
            { title: 'Browser-side validation', description: 'accept and maxSize validate in the browser for quick feedback. The server stays authoritative.' },
            { title: 'Hooks for custom UI', description: 'useUploadKit returns upload, progress, isUploading, result and error when you want to build the interface yourself.' },
            { title: 'Theming with CSS variables', description: 'Components read --uk-* custom properties, so they work in projects that do not use Tailwind.' },
          ]}
        />
      </LandingSection>

      <LandingSection
        id="install"
        eyebrow="Install"
        title="Install and use a React upload component"
        lead="Install the packages, mount the provider once, then drop components anywhere in the tree."
      >
        <CodeBlock lang="bash" title="Terminal" code={INSTALL} />
        <p>
          In Next.js you use <code>@uploadkitdev/next</code> for the route handler and file router. See the{' '}
          <a href="https://docs.uploadkit.dev/docs/getting-started/nextjs">Next.js guide</a> or the{' '}
          <a href="https://docs.uploadkit.dev/docs/getting-started/react">React / Vite guide</a> for the
          backend step. The provider then points at that endpoint:
        </p>
        <CodeBlock lang="tsx" title="app/layout.tsx" code={PROVIDER} />
        <CodeBlock lang="tsx" title="Using UploadButton and UploadDropzone" code={USAGE} />
      </LandingSection>

      <LandingSection
        id="cli"
        eyebrow="CLI"
        title="Add a component with npx uploadkit add"
        lead="The CLI inserts a component into an existing React or Next.js App Router file."
      >
        <p>
          <code>npx uploadkit add &lt;alias&gt;</code> adds a named import from{' '}
          <code>@uploadkitdev/react</code> to the target file and inserts a JSX snippet as the first child
          of the default-exported component, wrapped in <code>uploadkit:start</code> and{' '}
          <code>uploadkit:end</code> marker comments so a second run skips it. It backs up the file before
          editing. Source files are not copied into your repository, so updates arrive through the npm
          package. The command supports React frameworks only and requires the App Router on Next.js.
          There is no shadcn registry behind it.
        </p>
        <CodeBlock lang="bash" title="Terminal" code={CLI} />
        <p>
          Twenty components have an alias: {CATALOG.flatMap((g) => g.entries)
            .filter((e) => e.alias)
            .map((e) => e.alias)
            .join(', ')}
          . The catalog below shows which alias maps to which component.
        </p>
      </LandingSection>

      <LandingSection
        id="theming"
        eyebrow="Theming"
        title="Theme with CSS variables or Tailwind"
        lead="Components read --uk-* custom properties. They do not depend on Tailwind classes."
      >
        <p>
          Import <code>@uploadkitdev/react/styles.css</code> once. It defines tokens such as{' '}
          <code>--uk-primary</code>, <code>--uk-bg</code>, <code>--uk-border</code>, <code>--uk-text</code>,{' '}
          <code>--uk-radius</code> and <code>--uk-font</code>. Dark values apply automatically through{' '}
          <code>prefers-color-scheme</code>, or explicitly with a <code>data-theme=&quot;dark&quot;</code>{' '}
          attribute or a <code>.dark</code> class. Variant components add their own variables, for example{' '}
          <code>--uk-neon-glow</code> on the neon dropzone.
        </p>
        <CodeBlock lang="typescript" title="styles.css import and token overrides" code={CSS_SNIPPET} />
        <p>
          With Tailwind, wrap your config in <code>withUk</code>. It adds the package build to your content
          paths and registers variants for elements (<code>uk-button</code>, <code>uk-container</code>,{' '}
          <code>uk-progress-bar</code> and others) and for states (<code>uk-idle</code>,{' '}
          <code>uk-uploading</code>, <code>uk-success</code>, <code>uk-error</code>,{' '}
          <code>uk-dragging</code>), so you can style a component state with utility classes.
        </p>
        <CodeBlock lang="typescript" title="tailwind.config.ts" code={TAILWIND} />
      </LandingSection>

      <LandingSection
        id="catalog"
        eyebrow="Catalog"
        title={`All ${COMPONENT_COUNT} components`}
        lead="Every export from @uploadkitdev/react that renders UI, with a one-line description, its CLI alias where one exists, and a link to its reference page."
      >
        {CATALOG.map((group) => (
          <div key={group.id} id={group.id} style={{ marginBottom: 40 }}>
            <h3>
              {group.title} ({group.entries.length})
            </h3>
            <p>{group.lead}</p>
            <ul role="list">
              {group.entries.map((e) => (
                <li key={e.name} style={{ marginBottom: 12 }}>
                  <strong>
                    {e.docs ? (
                      <a href={`${DOCS_BASE}${e.docs}`}>
                        <code>{e.name}</code>
                      </a>
                    ) : (
                      <code>{e.name}</code>
                    )}
                  </strong>
                  : {e.description}
                  {e.alias && (
                    <>
                      {' '}
                      CLI: <code>npx uploadkit add {e.alias}</code>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </LandingSection>

      <LandingSection
        id="gallery"
        eyebrow="Live demo"
        title="Try the components"
        lead="The gallery below is interactive and uses the same package."
      >
        <ComponentShowcase />
      </LandingSection>

      <FaqSection items={FAQ} emitJsonLd={false} />

      <RelatedLinks
        title="Related"
        links={[
          { label: 'React setup guide', href: 'https://docs.uploadkit.dev/docs/getting-started/react', description: 'Provider, hooks and components in a Vite or React app' },
          { label: 'File upload for Next.js', href: '/nextjs' },
          { label: 'File upload for Vite', href: '/vite' },
          { label: 'Modern drag-and-drop file upload in React', href: '/blog/modern-drag-drop-file-upload-react' },
          { label: 'Building an image crop tool in React', href: '/blog/image-crop-tool-react' },
          { label: 'File upload progress bars done right', href: '/blog/file-upload-progress-bars' },
          { label: 'Pricing', href: '/pricing' },
        ]}
      />

      <CtaBand
        title="Ship uploads with the component that fits your UI"
        lead="The Free plan includes 5 GB storage, 2 GB bandwidth a month and 1,000 uploads a month."
      />
    </LandingShell>
  )
}
