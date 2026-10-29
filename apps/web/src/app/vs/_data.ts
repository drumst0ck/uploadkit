import type { ReactNode } from 'react'
import type { FaqEntry } from '@/lib/json-ld'

export interface CompareConfig {
  slug: 'uploadthing' | 'uploadcare' | 'filestack' | 'bytescale'
  name: string
  heroTitle: string
  heroLead: string
  intro: string[]
  tableCaption: string
  rows: { feature: string; us: ReactNode; them: ReactNode; note?: ReactNode }[]
  sources: { label: string; href: string }[]
  whenThem: { title: string; description: string }[]
  whenUs: { title: string; description: string }[]
  migrationTitle: string
  migration: string[]
  migrationLink?: { label: string; href: string }
  faq: FaqEntry[]
  related: { label: string; href: string; description?: string }[]
}

export const CHECKED = 'checked October 2026'

export const QUICKSTART_INSTALL = 'npm install @uploadkitdev/next @uploadkitdev/react'

// From apps/docs/content/docs/getting-started/nextjs.mdx
export const QUICKSTART_COMPONENT = `import { UploadButton } from '@uploadkitdev/react';

export default function ProfilePage() {
  return (
    <UploadButton
      route="imageUploader"
      onUploadComplete={(files) => {
        console.log('Files uploaded:', files.map((f) => f.url));
      }}
      onUploadError={(error) => {
        alert(\`Upload failed: \${error.message}\`);
      }}
    />
  );
}`

const UK_FRAMEWORK =
  'React-first. @uploadkitdev/next adds a Next.js route handler; docs also cover Remix, SvelteKit and Vite.'

const sharedRelated = [
  { label: 'UploadKit pricing', href: '/pricing', description: 'Free, Pro, Team and Enterprise limits' },
  { label: 'React upload components', href: '/components', description: '40+ components, MIT licensed' },
  { label: 'Bring your own storage', href: '/byos', description: 'Use your own S3 or R2 bucket' },
  { label: 'Next.js quickstart', href: 'https://docs.uploadkit.dev/docs/getting-started/nextjs' },
  { label: 'React quickstart', href: 'https://docs.uploadkit.dev/docs/getting-started/react' },
  { label: 'BYOS concepts', href: 'https://docs.uploadkit.dev/docs/core-concepts/byos' },
  { label: 'Backend adapters', href: 'https://docs.uploadkit.dev/docs/sdk/next/backend-adapters' },
]

const siblings = (slug: string) =>
  [
    { label: 'UploadKit vs UploadThing', href: '/vs/uploadthing' },
    { label: 'UploadKit vs Uploadcare', href: '/vs/uploadcare' },
    { label: 'UploadKit vs Filestack', href: '/vs/filestack' },
    { label: 'UploadKit vs Bytescale', href: '/vs/bytescale' },
  ].filter((l) => l.href !== `/vs/${slug}`)

export const COMPARISONS: Record<CompareConfig['slug'], CompareConfig> = {
  uploadthing: {
    slug: 'uploadthing',
    name: 'UploadThing',
    heroTitle: 'UploadKit vs UploadThing',
    heroLead:
      'Two TypeScript-first upload SDKs with a file router, React components and an MIT license. This page compares pricing, limits, storage model and where each one fits.',
    intro: [
      'UploadThing and UploadKit solve the same problem in a similar way: you declare upload routes on the server, and the client gets typed components that talk to them. If you already use UploadThing, the API will feel familiar, which is also why people ask how the two differ.',
      'The differences are mostly about pricing model and storage. UploadThing bills for the storage you use and does not charge for bandwidth. UploadKit has fixed plans with monthly bandwidth and upload limits, a larger component library, and a self-hosted path where files go to your own S3-compatible bucket.',
    ],
    tableCaption: 'UploadKit and UploadThing side by side',
    rows: [
      {
        feature: 'Pricing entry point',
        us: 'Free at $0; Pro $15/mo; Team $35/mo',
        them: 'Free at $0; $10/mo for 100 GB; usage-based from $25/mo',
      },
      {
        feature: 'Free plan',
        us: '5 GB storage, 2 GB bandwidth per month, 1,000 uploads per month, 2 projects',
        them: '2 GB storage shared across apps',
      },
      {
        feature: 'Storage and bandwidth model',
        us: 'Fixed plan limits for storage, monthly bandwidth and uploads',
        them: 'Pay for storage used; unlimited uploads and downloads, no bandwidth or seat charges',
        note: 'UploadThing has no bandwidth cap. UploadKit Free caps bandwidth at 2 GB per month.',
      },
      {
        feature: 'Max file size',
        us: 'Free 4 MB, Pro 512 MB, Team 5 GB',
        them: 'Not listed in the sources we checked',
      },
      {
        feature: 'Own bucket support',
        us: 'Yes, self-hosted: pass a storage adapter (S3, R2, MinIO). UploadKit Cloud stores files on UploadKit’s managed R2 and CDN.',
        them: 'Files are stored on UploadThing’s managed infrastructure',
      },
      {
        feature: 'Open-source SDK and components',
        us: 'MIT-licensed SDK and 40+ React components',
        them: 'MIT-licensed SDK (github.com/pingdotgg/uploadthing)',
      },
      {
        feature: 'Framework focus',
        us: UK_FRAMEWORK,
        them: 'Not compared here; see the UploadThing docs',
      },
    ],
    sources: [
      { label: 'UploadThing pricing', href: 'https://uploadthing.com/pricing' },
      { label: 'UploadThing usage-based pricing post', href: 'https://docs.uploadthing.com/blog/usage-based' },
      { label: 'UploadThing on GitHub', href: 'https://github.com/pingdotgg/uploadthing' },
    ],
    whenThem: [
      {
        title: 'You serve a lot of downloads',
        description:
          'UploadThing does not charge for bandwidth, only for storage used. If your files are downloaded heavily, the 2 GB monthly bandwidth on UploadKit Free will run out quickly, and even Pro caps at 200 GB.',
      },
      {
        title: 'You want pure pay-for-storage billing',
        description:
          'Usage-based billing from $25/mo with unlimited uploads and downloads is easy to reason about if your storage grows predictably.',
      },
      {
        title: 'You are already on it and happy',
        description:
          'If UploadThing covers your needs and the bill is fine, migrating has a cost with no payoff. Switch only for a concrete reason.',
      },
    ],
    whenUs: [
      {
        title: 'You want a bigger free tier',
        description:
          'UploadKit Free includes 5 GB of storage against 2 GB on UploadThing Free, plus 2 GB of monthly bandwidth and 1,000 uploads a month.',
      },
      {
        title: 'You want files in your own bucket',
        description:
          'Self-hosted BYOS sends files to your S3, R2 or MinIO bucket through a storage adapter, with the same components on the frontend.',
      },
      {
        title: 'You want a larger component set',
        description:
          'The React package ships 40+ components (button, dropzone, modal, progress and more) under MIT, so you restyle instead of building from scratch.',
      },
      {
        title: 'You want a lower entry paid plan',
        description:
          'Pro is $15/mo for 100 GB storage, 200 GB bandwidth and 512 MB files. Compare that with your actual usage; UploadThing’s $10/mo tier also includes 100 GB.',
      },
    ],
    migrationTitle: 'Moving from UploadThing to UploadKit',
    migration: [
      'Both SDKs use a server-side file router, so most of the migration is renaming imports, translating route definitions and swapping the client components. The step-by-step guide covers the route mapping, environment variables and the components to replace.',
      'The quickest check is to install the packages next to your current setup and port one route first. This is the button component from the Next.js quickstart:',
    ],
    migrationLink: {
      label: 'Read the migration guide: UploadThing to UploadKit',
      href: '/blog/migrate-from-uploadthing-to-uploadkit',
    },
    faq: [
      {
        question: 'Is UploadKit an UploadThing alternative?',
        answer:
          'Yes. Both are TypeScript upload SDKs with server-side routes and React components. UploadKit adds fixed-limit plans, a 40+ component library and a self-hosted option that stores files in your own S3-compatible bucket.',
      },
      {
        question: 'How does UploadThing pricing compare to UploadKit?',
        answer:
          'UploadThing Free is $0 with 2 GB of storage; $10/mo gives 100 GB, and usage-based starts at $25/mo with 250 GB then $0.08/GB, with no bandwidth charges (checked October 2026). UploadKit is $0 Free, $15/mo Pro and $35/mo Team, with storage, bandwidth and upload limits per plan.',
        link: { label: 'UploadKit pricing', href: '/pricing' },
      },
      {
        question: 'Does UploadKit charge for bandwidth?',
        answer:
          'Plans include a monthly bandwidth allowance: 2 GB on Free, 200 GB on Pro and 2 TB on Team. UploadThing does not charge for bandwidth, which is a real advantage for download-heavy apps.',
      },
      {
        question: 'Can I use my own S3 or R2 bucket?',
        answer:
          'With self-hosted UploadKit you pass a storage adapter to createUploadKitHandler and files go to your S3, R2 or MinIO bucket. UploadKit Cloud stores files on UploadKit’s managed infrastructure.',
        link: { label: 'BYOS docs', href: 'https://docs.uploadkit.dev/docs/core-concepts/byos' },
      },
      {
        question: 'Are both SDKs open source?',
        answer:
          'Yes. The UploadThing SDK is MIT licensed on GitHub, and the UploadKit SDK and React components are MIT licensed too.',
      },
    ],
    related: [
      { label: 'UploadThing alternatives in 2026', href: '/blog/uploadthing-alternatives-2026' },
      { label: 'Migrate from UploadThing to UploadKit', href: '/blog/migrate-from-uploadthing-to-uploadkit' },
      { label: 'BYOS: bring your own storage', href: '/blog/byos-bring-your-own-storage' },
      ...siblings('uploadthing'),
      ...sharedRelated,
      { label: 'Next.js file uploads', href: '/nextjs' },
    ],
  },

  uploadcare: {
    slug: 'uploadcare',
    name: 'Uploadcare',
    heroTitle: 'UploadKit vs Uploadcare',
    heroLead:
      'Uploadcare is a hosted file platform with an operations-based pricing model. UploadKit is an open-source SDK with fixed plans. Here is how pricing, limits and storage compare.',
    intro: [
      'Uploadcare sells a file handling platform: uploads, a CDN and processing, billed in operations and traffic. UploadKit is narrower. It focuses on the upload flow, with a typed server route, React components and either managed storage or your own bucket.',
      'If you searched for an Uploadcare alternative, the usual reasons are the price of the paid tier and the personal-use restriction on the free plan. The comparison below sticks to the numbers each vendor publishes.',
    ],
    tableCaption: 'UploadKit and Uploadcare side by side',
    rows: [
      {
        feature: 'Pricing entry point',
        us: 'Free at $0; Pro $15/mo',
        them: 'Free at $0 (personal use only); Pro $66/mo',
      },
      {
        feature: 'Free plan',
        us: '5 GB storage, 2 GB bandwidth per month, 1,000 uploads per month, 2 projects',
        them: '1,000 operations per month, personal use only',
      },
      {
        feature: 'Storage and bandwidth model',
        us: 'Fixed plan limits for storage, monthly bandwidth and uploads',
        them: 'Operations plus included storage and traffic. Pro: 5,000 operations, 10 GB storage, 25 GB traffic, then $0.35/GB',
        note: 'Business is $166/mo with 50,000 operations.',
      },
      {
        feature: 'Max file size',
        us: 'Free 4 MB, Pro 512 MB, Team 5 GB',
        them: 'Free 500 MB, Pro 1 GB, Business 10 GB',
        note: 'Uploadcare’s Free limit is higher than UploadKit Free’s 4 MB.',
      },
      {
        feature: 'Own bucket support',
        us: 'Yes, self-hosted: storage adapter for S3, R2 or MinIO',
        them: '“Connect AWS S3 Storage” is listed on Enterprise',
      },
      {
        feature: 'Open-source SDK and components',
        us: 'MIT-licensed SDK and 40+ React components',
        them: 'Not verified here; see the Uploadcare docs',
      },
      {
        feature: 'Framework focus',
        us: UK_FRAMEWORK,
        them: 'Not compared here; see the Uploadcare docs',
      },
    ],
    sources: [{ label: 'Uploadcare pricing', href: 'https://uploadcare.com/pricing/' }],
    whenThem: [
      {
        title: 'You need large files on the free plan',
        description:
          'Uploadcare Free allows 500 MB per file, against 4 MB on UploadKit Free. For a personal project that handles big files, that matters.',
      },
      {
        title: 'You need very large files on a business plan',
        description:
          'Uploadcare Business lists a 10 GB max file size. UploadKit Team goes to 5 GB.',
      },
      {
        title: 'You want a broader file platform',
        description:
          'If you want one vendor for uploads, delivery and processing under an enterprise contract, Uploadcare’s platform is built for that. UploadKit is deliberately smaller.',
      },
    ],
    whenUs: [
      {
        title: 'You want a lower paid entry price',
        description:
          'UploadKit Pro is $15/mo with 100 GB storage, 200 GB bandwidth and 512 MB files. Uploadcare Pro is $66/mo with 10 GB storage and 25 GB traffic included.',
      },
      {
        title: 'You need to use the free plan commercially',
        description:
          'Uploadcare Free is for personal use only. UploadKit Free has no such restriction listed in its plan limits, so you can ship a real product on it within the limits.',
      },
      {
        title: 'You want an open-source SDK',
        description:
          'The UploadKit SDK and 40+ React components are MIT licensed, so you can read, fork and restyle them.',
      },
      {
        title: 'You want your own bucket without an enterprise contract',
        description:
          'Self-hosted UploadKit takes a storage adapter for S3, R2 or MinIO. Uploadcare lists its S3 connection on the Enterprise plan.',
      },
    ],
    migrationTitle: 'Moving from Uploadcare to UploadKit',
    migration: [
      'Uploadcare’s widget and UploadKit’s components are different APIs, so plan on replacing the client component and defining a server route that authorizes uploads. Existing files can stay where they are while new uploads go through UploadKit; you only need to move old files if you want a single source.',
      'A minimal replacement for an upload button looks like this:',
    ],
    faq: [
      {
        question: 'Is UploadKit a good Uploadcare alternative?',
        answer:
          'For upload flows, yes: a typed server route, React components and a free plan with 5 GB storage. If you rely on Uploadcare’s wider processing and delivery platform, compare feature by feature before switching.',
      },
      {
        question: 'How much does Uploadcare cost compared to UploadKit?',
        answer:
          'Uploadcare Pro is $66/mo and Business is $166/mo (checked October 2026). UploadKit Pro is $15/mo and Team is $35/mo, with different included limits, so compare against your own usage.',
        link: { label: 'UploadKit pricing', href: '/pricing' },
      },
      {
        question: 'Can I use Uploadcare’s free plan for a business?',
        answer:
          'Uploadcare lists its Free plan as personal use only (checked October 2026). Check their current terms before relying on it for a commercial product.',
      },
      {
        question: 'Does UploadKit support my own S3 bucket?',
        answer:
          'Yes, in the self-hosted setup: pass a storage adapter for S3, R2 or MinIO to createUploadKitHandler. UploadKit Cloud keeps files on UploadKit’s managed storage.',
        link: { label: 'BYOS docs', href: 'https://docs.uploadkit.dev/docs/core-concepts/byos' },
      },
      {
        question: 'What is the maximum file size on UploadKit?',
        answer: 'Free is 4 MB, Pro is 512 MB and Team is 5 GB per file.',
      },
    ],
    related: [
      { label: 'UploadThing alternatives in 2026', href: '/blog/uploadthing-alternatives-2026' },
      { label: 'S3 vs R2 vs Backblaze pricing', href: '/blog/s3-vs-r2-vs-backblaze-pricing' },
      ...siblings('uploadcare'),
      ...sharedRelated,
    ],
  },

  filestack: {
    slug: 'filestack',
    name: 'Filestack',
    heroTitle: 'UploadKit vs Filestack',
    heroLead:
      'Filestack is a long-running upload and transformation service with paid tiers from $69/mo. UploadKit is an open-source SDK with a 5 GB free plan. Compare the published numbers.',
    intro: [
      'Filestack provides a file picker, an upload API and file transformations, and it supports uploading to your own Amazon S3, Google Cloud Storage or Azure bucket on every plan. UploadKit also supports your own bucket, through a self-hosted storage adapter, so storage ownership is not what separates the two.',
      'The practical differences are price, the free plan and the SDK license. UploadKit’s SDK and components are MIT licensed, and the free plan is larger on storage and bandwidth. Filestack’s free plan allows bigger single files.',
    ],
    tableCaption: 'UploadKit and Filestack side by side',
    rows: [
      {
        feature: 'Pricing entry point',
        us: 'Free at $0; Pro $15/mo',
        them: 'Free at $0; Start $69/mo',
        note: 'Filestack also lists Grow at $199/mo and Scale at $379/mo.',
      },
      {
        feature: 'Free plan',
        us: '5 GB storage, 2 GB bandwidth per month, 1,000 uploads per month, 2 projects',
        them: '500 uploads, 1 GB storage, 1 GB bandwidth, 1,000 transformations, 1 team member',
      },
      {
        feature: 'Storage and bandwidth model',
        us: 'Fixed plan limits for storage, monthly bandwidth and uploads',
        them: 'Plan-based quotas for uploads, storage, bandwidth and transformations',
      },
      {
        feature: 'Max file size',
        us: 'Free 4 MB, Pro 512 MB, Team 5 GB',
        them: 'Free 20 MB',
        note: 'Filestack’s free file limit is higher than UploadKit Free’s 4 MB.',
      },
      {
        feature: 'Own bucket support',
        us: 'Yes, self-hosted: storage adapter for S3, R2 or MinIO',
        them: 'Yes: uploads to your own Amazon S3, GCS or Azure on all plans',
        note: 'Both support customer buckets. Filestack covers more providers.',
      },
      {
        feature: 'Open-source SDK and components',
        us: 'MIT-licensed SDK and 40+ React components',
        them: 'Not verified here; see the Filestack docs',
      },
      {
        feature: 'Framework focus',
        us: UK_FRAMEWORK,
        them: 'Not compared here; see the Filestack docs',
      },
    ],
    sources: [
      { label: 'Filestack pricing', href: 'https://www.filestack.com/pricing/' },
      { label: 'Filestack free signup', href: 'https://www.filestack.com/signup-free/' },
    ],
    whenThem: [
      {
        title: 'You use Google Cloud Storage or Azure',
        description:
          'Filestack lists S3, GCS and Azure as upload targets. UploadKit’s documented adapters are S3, R2 and MinIO.',
      },
      {
        title: 'You need transformations on the free plan',
        description:
          'Filestack Free includes 1,000 transformations. UploadKit Free has no image transforms; they start on Pro.',
      },
      {
        title: 'You want an established vendor contract',
        description:
          'Filestack has fixed tiers up to $379/mo and a long track record, which some procurement teams prefer.',
      },
    ],
    whenUs: [
      {
        title: 'You want a lower starting price',
        description:
          'UploadKit Pro is $15/mo for 100 GB storage, 200 GB bandwidth and 512 MB files. Filestack’s first paid tier is $69/mo.',
      },
      {
        title: 'You want more free storage and bandwidth',
        description:
          'UploadKit Free gives 5 GB storage and 2 GB bandwidth per month. Filestack Free gives 1 GB of each.',
      },
      {
        title: 'You want an open-source SDK and ready components',
        description:
          'The SDK and 40+ React components are MIT licensed, so the UI lives in your repo and you can restyle it.',
      },
    ],
    migrationTitle: 'Moving from Filestack to UploadKit',
    migration: [
      'If you upload to your own bucket through Filestack, your existing files already live where you want them. You can point UploadKit’s storage adapter at the same bucket and keep reading old objects while new uploads go through the UploadKit route. Replace Filestack’s picker with an UploadKit component:',
    ],
    faq: [
      {
        question: 'Is UploadKit a Filestack alternative?',
        answer:
          'For uploads, yes. UploadKit provides a typed server route, 40+ React components and a free plan. If you depend on Filestack’s transformation features, compare that part separately.',
      },
      {
        question: 'Does UploadKit support my own bucket like Filestack does?',
        answer:
          'Yes, in self-hosted mode: a storage adapter for S3, R2 or MinIO. Filestack also supports your own S3, GCS and Azure buckets, so this is not a difference between them.',
        link: { label: 'BYOS docs', href: 'https://docs.uploadkit.dev/docs/core-concepts/byos' },
      },
      {
        question: 'How much does Filestack cost?',
        answer:
          'Filestack Start is $69/mo, Grow is $199/mo and Scale is $379/mo; the Free plan has 500 uploads and 1 GB storage (checked October 2026). UploadKit Pro is $15/mo and Team is $35/mo.',
        link: { label: 'UploadKit pricing', href: '/pricing' },
      },
      {
        question: 'What are the free plan limits?',
        answer:
          'UploadKit Free: 5 GB storage, 2 GB bandwidth per month, 4 MB max file, 1,000 uploads per month. Filestack Free: 500 uploads, 1 GB storage, 1 GB bandwidth, 20 MB max file.',
      },
    ],
    related: [
      { label: 'UploadThing alternatives in 2026', href: '/blog/uploadthing-alternatives-2026' },
      { label: 'BYOS: bring your own storage', href: '/blog/byos-bring-your-own-storage' },
      ...siblings('filestack'),
      ...sharedRelated,
    ],
  },

  bytescale: {
    slug: 'bytescale',
    name: 'Bytescale',
    heroTitle: 'UploadKit vs Bytescale',
    heroLead:
      'Bytescale starts at $7/mo with no free-forever plan listed. UploadKit has a free plan, an MIT SDK and 40+ React components. Compare pricing, limits and storage options.',
    intro: [
      'Bytescale is an upload and media hosting service with paid plans and a free trial. It is the cheapest paid starting point of the vendors on this list at $7/mo, and it supports external storage such as AWS S3, Cloudflare R2, Google Storage and DigitalOcean Spaces.',
      'UploadKit differs on the free plan, the open-source SDK and the component library. It does not differ on bring-your-own-bucket support, since both offer it.',
    ],
    tableCaption: 'UploadKit and Bytescale side by side',
    rows: [
      {
        feature: 'Pricing entry point',
        us: 'Free at $0; Pro $15/mo',
        them: 'Basic $7/mo; Plus $35/mo; Advanced $195/mo',
      },
      {
        feature: 'Free plan',
        us: '5 GB storage, 2 GB bandwidth per month, 1,000 uploads per month, 2 projects',
        them: 'No free-forever plan stated; paid plans come with a free trial',
      },
      {
        feature: 'Storage and bandwidth model',
        us: 'Fixed plan limits for storage, monthly bandwidth and uploads',
        them: 'Basic: 10 GB storage, 10 GB download bandwidth, 20K upload requests. Plus: 50 GB, 50 GB, 100K. Advanced: 300 GB, 300 GB, 500K',
      },
      {
        feature: 'Max file size',
        us: 'Free 4 MB, Pro 512 MB, Team 5 GB',
        them: 'Basic 500 MB, Plus 5 GB, Advanced 100 GB',
      },
      {
        feature: 'Own bucket support',
        us: 'Yes, self-hosted: storage adapter for S3, R2 or MinIO',
        them: 'Yes: external storage on AWS S3, Cloudflare R2, Google Storage and DigitalOcean Spaces',
        note: 'Both support customer buckets.',
      },
      {
        feature: 'Open-source SDK and components',
        us: 'MIT-licensed SDK and 40+ React components',
        them: 'Not verified here; see the Bytescale docs',
      },
      {
        feature: 'Framework focus',
        us: UK_FRAMEWORK,
        them: 'Not compared here; see the Bytescale docs',
      },
    ],
    sources: [{ label: 'Bytescale pricing', href: 'https://www.bytescale.com/pricing' }],
    whenThem: [
      {
        title: 'You want the cheapest paid plan',
        description:
          'Basic at $7/mo is below UploadKit Pro at $15/mo. If 10 GB of storage and bandwidth is enough, it costs less.',
      },
      {
        title: 'You upload very large files',
        description:
          'Bytescale Advanced lists a 100 GB max upload and Plus lists 5 GB. UploadKit tops out at 5 GB on Team.',
      },
      {
        title: 'You use DigitalOcean Spaces or Google Storage',
        description:
          'Those are listed as supported external storage. UploadKit documents S3, R2 and MinIO adapters.',
      },
    ],
    whenUs: [
      {
        title: 'You want to start without paying',
        description:
          'UploadKit Free has no time limit: 5 GB storage, 2 GB bandwidth a month and 1,000 uploads a month. Bytescale lists paid plans with a trial.',
      },
      {
        title: 'You want more included capacity per dollar on Pro',
        description:
          'At $15/mo UploadKit Pro includes 100 GB storage and 200 GB bandwidth. Bytescale Plus at $35/mo includes 50 GB of each.',
      },
      {
        title: 'You want an open-source SDK and a component library',
        description:
          'The SDK and 40+ React components are MIT licensed and ship as code you can restyle.',
      },
    ],
    migrationTitle: 'Moving from Bytescale to UploadKit',
    migration: [
      'If your Bytescale account points at your own bucket, the files are already yours to keep. Point the UploadKit storage adapter at the same bucket, add an upload route that authorizes users, and swap the client component. This is the button from the Next.js quickstart:',
    ],
    faq: [
      {
        question: 'Is UploadKit a Bytescale alternative?',
        answer:
          'Yes for upload flows. UploadKit offers a typed server route, 40+ React components, a free plan and an MIT-licensed SDK. Bytescale is cheaper at its entry paid tier, so compare against your usage.',
      },
      {
        question: 'How much does Bytescale cost?',
        answer:
          'Basic is $7/mo, Plus is $35/mo and Advanced is $195/mo (checked October 2026). UploadKit is free to start, with Pro at $15/mo and Team at $35/mo.',
        link: { label: 'UploadKit pricing', href: '/pricing' },
      },
      {
        question: 'Does Bytescale have a free plan?',
        answer:
          'The pricing page we checked lists paid plans with a free trial and no free-forever plan (checked October 2026). UploadKit Free is permanent with 5 GB storage.',
      },
      {
        question: 'Do both support my own S3 or R2 bucket?',
        answer:
          'Yes. Bytescale supports external storage including S3 and R2. UploadKit supports S3, R2 and MinIO in self-hosted mode.',
        link: { label: 'BYOS docs', href: 'https://docs.uploadkit.dev/docs/core-concepts/byos' },
      },
      {
        question: 'What is UploadKit’s max file size?',
        answer: 'Free is 4 MB, Pro is 512 MB and Team is 5 GB per file.',
      },
    ],
    related: [
      { label: 'UploadThing alternatives in 2026', href: '/blog/uploadthing-alternatives-2026' },
      { label: 'S3 vs R2 vs Backblaze pricing', href: '/blog/s3-vs-r2-vs-backblaze-pricing' },
      ...siblings('bytescale'),
      ...sharedRelated,
    ],
  },
}
