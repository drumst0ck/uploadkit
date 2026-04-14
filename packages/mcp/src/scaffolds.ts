// Generators for common UploadKit boilerplate.

export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

export function installCommand(
  pm: PackageManager,
  deps: string[],
  dev = false,
): string {
  const list = deps.join(' ');
  const devFlag = dev ? ' -D' : '';
  switch (pm) {
    case 'pnpm':
      return `pnpm add${devFlag} ${list}`;
    case 'npm':
      return `npm install${dev ? ' --save-dev' : ''} ${list}`;
    case 'yarn':
      return `yarn add${dev ? ' --dev' : ''} ${list}`;
    case 'bun':
      return `bun add${devFlag} ${list}`;
  }
}

export function routeHandlerFile(
  routeName: string,
  opts: { maxFileSize?: string; allowedTypes?: string[]; maxFileCount?: number } = {},
): string {
  const maxFileSize = opts.maxFileSize ?? '4MB';
  const allowedTypes = opts.allowedTypes ?? ['image/*'];
  const maxFileCount = opts.maxFileCount ?? 1;

  return `// app/api/uploadkit/[...uploadkit]/route.ts
import { createUploadKitHandler } from '@uploadkitdev/next';
import type { FileRouter } from '@uploadkitdev/next';

const router = {
  ${routeName}: {
    maxFileSize: '${maxFileSize}',
    maxFileCount: ${maxFileCount},
    allowedTypes: ${JSON.stringify(allowedTypes)},
  },
} satisfies FileRouter;

export type AppFileRouter = typeof router;

const handler = createUploadKitHandler({
  router,
  apiKey: process.env.UPLOADKIT_API_KEY!,
  // For BYOS: add your storage config here. See get_byos_config tool.
});

export const { GET, POST } = handler;
`;
}

export function providerSnippet(): {
  layoutPatch: string;
  notes: string;
} {
  return {
    layoutPatch: `// app/layout.tsx (add)
import '@uploadkitdev/react/styles.css';
import { UploadKitProvider } from '@uploadkitdev/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <UploadKitProvider endpoint="/api/uploadkit">
          {children}
        </UploadKitProvider>
      </body>
    </html>
  );
}`,
    notes:
      'Wrap your entire app tree with UploadKitProvider. The endpoint must match the route handler path (app/api/uploadkit/[...uploadkit]/route.ts → /api/uploadkit).',
  };
}

export function byosConfig(provider: 's3' | 'r2' | 'gcs' | 'b2'): {
  env: string;
  handler: string;
  notes: string;
} {
  if (provider === 'r2') {
    return {
      env: `# .env.local
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET=your-bucket`,
      handler: `import { createUploadKitHandler, type FileRouter } from '@uploadkitdev/next';
import { createR2Storage } from '@uploadkitdev/next/byos';

const router = { media: { maxFileSize: '8MB', maxFileCount: 4, allowedTypes: ['image/*'] } } satisfies FileRouter;

export const { GET, POST } = createUploadKitHandler({
  router,
  storage: createR2Storage({
    accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID!,
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    bucket: process.env.CLOUDFLARE_R2_BUCKET!,
  }),
});`,
      notes:
        'R2 has zero egress fees. Credentials are server-side only — never exposed to the browser. Configure your bucket CORS to allow PUT from your domain.',
    };
  }
  if (provider === 's3') {
    return {
      env: `# .env.local
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=your-bucket`,
      handler: `import { createUploadKitHandler, type FileRouter } from '@uploadkitdev/next';
import { createS3Storage } from '@uploadkitdev/next/byos';

const router = { media: { maxFileSize: '8MB', maxFileCount: 4, allowedTypes: ['image/*'] } } satisfies FileRouter;

export const { GET, POST } = createUploadKitHandler({
  router,
  storage: createS3Storage({
    region: process.env.AWS_REGION!,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    bucket: process.env.AWS_S3_BUCKET!,
  }),
});`,
      notes:
        'Configure your bucket CORS to allow PUT from your domain. Watch egress costs on AWS S3 — consider R2 or B2 for cheaper bandwidth.',
    };
  }
  if (provider === 'gcs') {
    return {
      env: `# .env.local
GCS_PROJECT_ID=...
GCS_CLIENT_EMAIL=...
GCS_PRIVATE_KEY=...
GCS_BUCKET=your-bucket`,
      handler: `import { createUploadKitHandler, type FileRouter } from '@uploadkitdev/next';
import { createGCSStorage } from '@uploadkitdev/next/byos';

const router = { media: { maxFileSize: '8MB', maxFileCount: 4, allowedTypes: ['image/*'] } } satisfies FileRouter;

export const { GET, POST } = createUploadKitHandler({
  router,
  storage: createGCSStorage({
    projectId: process.env.GCS_PROJECT_ID!,
    clientEmail: process.env.GCS_CLIENT_EMAIL!,
    privateKey: process.env.GCS_PRIVATE_KEY!.replace(/\\\\n/g, '\\n'),
    bucket: process.env.GCS_BUCKET!,
  }),
});`,
      notes:
        'GCS is S3-compatible via the HMAC interop mode. Escape newlines in GCS_PRIVATE_KEY when storing as an env var.',
    };
  }
  // b2
  return {
    env: `# .env.local
B2_ENDPOINT=https://s3.us-west-002.backblazeb2.com
B2_ACCESS_KEY_ID=...
B2_SECRET_ACCESS_KEY=...
B2_BUCKET=your-bucket`,
    handler: `import { createUploadKitHandler, type FileRouter } from '@uploadkitdev/next';
import { createS3Storage } from '@uploadkitdev/next/byos';

const router = { media: { maxFileSize: '8MB', maxFileCount: 4, allowedTypes: ['image/*'] } } satisfies FileRouter;

export const { GET, POST } = createUploadKitHandler({
  router,
  storage: createS3Storage({
    endpoint: process.env.B2_ENDPOINT!,
    region: 'us-west-002',
    accessKeyId: process.env.B2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.B2_SECRET_ACCESS_KEY!,
    bucket: process.env.B2_BUCKET!,
    forcePathStyle: true,
  }),
});`,
    notes:
      'Backblaze B2 is S3-compatible — reuse createS3Storage with the B2 endpoint. forcePathStyle is required.',
  };
}

export const QUICKSTART = `# UploadKit Quickstart (Next.js App Router)

## 1. Install
pnpm add @uploadkitdev/react @uploadkitdev/next

## 2. Add env var
# .env.local
UPLOADKIT_API_KEY=uk_live_...   # from https://uploadkit.dev/dashboard

## 3. Create the route handler
# app/api/uploadkit/[...uploadkit]/route.ts
# (use scaffold_route_handler to generate)

## 4. Wrap your app
# app/layout.tsx — wrap children with <UploadKitProvider endpoint="/api/uploadkit">

## 5. Drop a component anywhere
import { UploadDropzone } from '@uploadkitdev/react';
<UploadDropzone route="media" />

## 6. (Optional) Bring Your Own Storage
# Use get_byos_config for S3/R2/GCS/B2 setup.
`;
