---
type: quick
tasks: 3
autonomous: true
files_modified:
  - packages/react/src/components/upload-button.tsx
  - packages/react/src/components/upload-dropzone.tsx
  - packages/react/src/components/upload-modal.tsx
  - packages/react/src/components/file-list.tsx
  - packages/react/src/components/file-preview.tsx
  - packages/react/src/index.ts
  - packages/react/src/styles.css
  - packages/react/src/tailwind.ts
  - packages/react/package.json
  - packages/react/tsup.config.ts
  - packages/core/src/proxy-client.ts
  - packages/core/src/types.ts
  - packages/next/src/handler.ts
  - packages/next/src/ssr-plugin.tsx
  - packages/next/src/index.ts
  - packages/next/src/adapters/express.ts
  - packages/next/src/adapters/fastify.ts
  - packages/next/src/adapters/hono.ts
  - packages/next/package.json
  - packages/next/tsup.config.ts
---

<objective>
Implement 7 UploadThing feature gaps to achieve full competitive parity: config.mode (manual/auto), onBeforeUploadBegin callback, data-uk-element/data-state attributes on all elements, progress granularity control, NextSSRPlugin for client hydration, withUk Tailwind wrapper with custom variants, and backend adapters for Express/Fastify/Hono.

Purpose: Close every feature gap identified against UploadThing so UploadKit is a drop-in replacement with zero missing capabilities.
Output: Updated SDK packages with all 7 features working, backward-compatible, fully built.
</objective>

<context>
@packages/react/src/components/upload-button.tsx
@packages/react/src/components/upload-dropzone.tsx
@packages/react/src/components/upload-modal.tsx
@packages/react/src/components/file-list.tsx
@packages/react/src/components/file-preview.tsx
@packages/react/src/index.ts
@packages/react/src/styles.css
@packages/react/src/use-upload-kit.ts
@packages/core/src/proxy-client.ts
@packages/core/src/index.ts
@packages/next/src/handler.ts
@packages/next/src/types.ts
@packages/next/src/router.ts
@packages/next/src/index.ts
@packages/react/package.json
@packages/react/tsup.config.ts
@packages/next/package.json
@packages/next/tsup.config.ts

<interfaces>
<!-- Key types and contracts the executor needs -->

From packages/core/src/proxy-client.ts:
```typescript
export interface ProxyUploadOptions {
  file: File;
  route: string;
  metadata?: Record<string, unknown>;
  onProgress?: (percentage: number) => void;
  signal?: AbortSignal;
}
```

From packages/next/src/types.ts:
```typescript
export type FileRouter = Record<string, RouteConfig<any>>;
export type RouteConfig<TMiddleware> = {
  maxFileSize?: string | number;
  maxFileCount?: number;
  allowedTypes?: string[];
  middleware?: (ctx: { req: Request }) => Promise<TMiddleware> | TMiddleware;
  onUploadComplete?: (args: { file: UploadedFile; metadata: TMiddleware }) => Promise<unknown> | unknown;
};
export interface UploadKitHandlerConfig<TRouter extends FileRouter> {
  router: TRouter;
  apiKey?: string;
  apiUrl?: string;
  storage?: S3CompatibleStorage;
}
```

From packages/react/src/components/upload-dropzone.tsx:
```typescript
type FileEntry = {
  id: string; file: File; status: UploadStatus;
  progress: number; result?: UploadResult | undefined;
  error?: Error | undefined; abortController?: AbortController | undefined;
};
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: SDK component features — config.mode, onBeforeUploadBegin, data attributes, progress granularity</name>
  <files>
    packages/react/src/components/upload-button.tsx
    packages/react/src/components/upload-dropzone.tsx
    packages/react/src/components/upload-modal.tsx
    packages/react/src/components/file-list.tsx
    packages/react/src/components/file-preview.tsx
    packages/react/src/styles.css
    packages/core/src/proxy-client.ts
  </files>
  <action>
**1A. config.mode prop (manual/auto)**

In `upload-button.tsx`:
- Add `config?: { mode?: 'auto' | 'manual' }` to `UploadButtonProps`.
- Default mode is `'auto'` (current behavior: upload immediately on file selection).
- When `mode === 'manual'`:
  - After file selection in `handleFileChange`, store the file in a new `useState<File | null>(null)` called `stagedFile` instead of calling `upload()`.
  - Change button text to show selected filename: "Upload [filename]" with a truncated name (max 20 chars + ellipsis).
  - On second click (when `stagedFile` is set), call `upload(stagedFile, metadata)` and clear `stagedFile`.
  - Add a small "x" button next to the staged filename to clear the selection without uploading.
- When `mode === 'auto'` (default), keep the existing single-click behavior unchanged.

In `upload-dropzone.tsx`:
- Add `config?: { mode?: 'auto' | 'manual' }` to `UploadDropzoneProps`.
- Default mode is `'manual'` for dropzone (matching UploadThing behavior: files are staged, user clicks "Upload").
- When `mode === 'manual'` (default):
  - In `processFiles`, after validation, add accepted files to state but do NOT start uploads.
  - Remove the batch upload loop from `processFiles`. Instead, store accepted entries with status `'idle'`.
  - Render a "Upload N file(s)" button below the file list when there are idle files. Style it with class `uk-dropzone__submit` using the same base button styles as `.uk-button`.
  - On submit button click, run the batch upload logic (the existing parallel-batches-of-3 code, extracted to a new `startUploads()` function).
  - Disable the submit button while any file is uploading.
- When `mode === 'auto'`:
  - Keep the current behavior: `processFiles` validates and immediately starts uploading.
- Pass `config` through from `UploadModal` to its inner `UploadDropzone`.

In `upload-modal.tsx`:
- Add `config?: { mode?: 'auto' | 'manual' }` to `UploadModalProps`.
- Forward `config` to the inner `<UploadDropzone>` component.

**1B. onBeforeUploadBegin callback**

In `upload-button.tsx`:
- Add `onBeforeUploadBegin?: (files: File[]) => File[] | Promise<File[]>` to `UploadButtonProps`.
- In `handleFileChange` (auto mode) or the manual mode upload trigger: after size validation but before `upload()`, call `onBeforeUploadBegin([file])`.
- If it returns an empty array, silently cancel (no upload, no error).
- If it throws, catch and call `onUploadError` with the thrown error.
- Use the first file from the returned array as the file to upload (allows renaming/modification).

In `upload-dropzone.tsx`:
- Add `onBeforeUploadBegin?: (files: File[]) => File[] | Promise<File[]>` to `UploadDropzoneProps`.
- In the upload trigger (either `processFiles` for auto mode, or `startUploads` for manual mode): after validation, call `onBeforeUploadBegin(acceptedFiles.map(e => e.file))`.
- If empty array returned, clear the staged files and return.
- If it throws, call `onUploadError` with the error.
- Map returned files back to FileEntry objects for upload.

In `upload-modal.tsx`:
- Add `onBeforeUploadBegin` to `UploadModalProps` and forward to `UploadDropzone`.

**1C. data-uk-element and data-state attributes**

Add `data-uk-element` to ALL rendered elements across all 5 components. Add `data-state` where stateful. This enables CSS targeting via `[data-uk-element="button"]` and Tailwind variants.

In `upload-button.tsx`:
- `<button>`: add `data-uk-element="button"` and rename existing `data-status` to `data-state` (values: `ready`, `uploading`, `success`, `error`). Map `idle` status to `ready` for the attribute value.
- Progress wrapper div: `data-uk-element="progress-bar"`
- Progress text span: `data-uk-element="progress-text"`

In `upload-dropzone.tsx`:
- Outer drop zone div: `data-uk-element="container"` and `data-state` with values `idle`, `dragging`, `uploading`, `success`, `error`. Derive composite state: if `isDragging` -> `dragging`, else if any file uploading -> `uploading`, else if all files success -> `success`, else if any error -> `error`, else `idle`.
- Icon div: `data-uk-element="upload-icon"`
- Label paragraph: `data-uk-element="label"`
- Hint paragraph: `data-uk-element="allowed-content"`
- Each file item div: `data-uk-element="file-item"` and `data-state` with the file's status
- Submit button (manual mode): `data-uk-element="submit-button"`

In `upload-modal.tsx`:
- `<dialog>`: `data-uk-element="modal"`
- Content div: `data-uk-element="modal-content"`
- Title h2: `data-uk-element="modal-title"`

In `file-list.tsx`:
- List wrapper div: `data-uk-element="file-list"`
- Each file item div: `data-uk-element="file-item"`
- File name span: `data-uk-element="file-name"`
- File size span: `data-uk-element="file-size"`
- Delete button: `data-uk-element="delete-button"`

In `file-preview.tsx`:
- Container div: `data-uk-element="preview"`
- Image element: `data-uk-element="preview-image"`
- Icon div: `data-uk-element="preview-icon"`

**1D. Progress granularity**

In `packages/core/src/proxy-client.ts`:
- Add `progressGranularity?: 'coarse' | 'fine' | 'all'` to `ProxyUploadOptions`.
- In `#xhrPut`, accept `progressGranularity` in opts.
- Implement throttling in `xhr.upload.onprogress`:
  - `'all'`: call `onProgress` on every event (current behavior).
  - `'coarse'` (default): track `lastReportedPercent` — only call `onProgress` when the new percent crosses the next 10% threshold (10, 20, 30, ..., 90, 100).
  - `'fine'`: only call when crossing next 2% threshold.
- Always fire 100% on completion regardless of granularity.

In `upload-button.tsx` and `upload-dropzone.tsx`:
- Add `uploadProgressGranularity?: 'coarse' | 'fine' | 'all'` to both props types.
- Pass through to `client.upload()` calls as `progressGranularity`.
- Default: do NOT set a default in the components — let proxy-client default to `'coarse'`.

In `upload-modal.tsx`:
- Add `uploadProgressGranularity` to props and forward to `UploadDropzone`.

**CSS additions in styles.css:**
- Add styles for `.uk-dropzone__submit` button:
  ```css
  .uk-dropzone__submit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 16px;
    margin-top: 12px;
    border-radius: var(--uk-radius);
    background: var(--uk-primary);
    color: #ffffff;
    font-family: var(--uk-font);
    font-size: 13px;
    font-weight: 500;
    line-height: 1;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all var(--uk-transition);
    -webkit-appearance: none;
    appearance: none;
  }
  .uk-dropzone__submit:hover { background: var(--uk-primary-hover); }
  .uk-dropzone__submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .uk-dropzone__submit:focus-visible { outline: 2px solid var(--uk-primary); outline-offset: 2px; }
  ```
- Add `.uk-button__staged` style for the staged filename display in manual button mode:
  ```css
  .uk-button__staged {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }
  .uk-button__staged-clear {
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    color: var(--uk-text-secondary);
    display: flex;
    align-items: center;
    transition: color var(--uk-transition);
  }
  .uk-button__staged-clear:hover { color: var(--uk-error); }
  ```
- Add `.uk-dropzone__submit` to the reduced-motion selector list.

**Backward compatibility:** All new props are optional with sensible defaults. UploadButton defaults to `mode: 'auto'` (unchanged behavior). UploadDropzone defaults to `mode: 'manual'` — this IS a behavior change but matches UploadThing's UX. Document this in the commit message. Existing `data-status` renamed to `data-state` on the button — minor breaking change for anyone targeting `[data-status]` in CSS; document in commit.
  </action>
  <verify>
    <automated>cd /Users/drumstock/Developer/GitHub/uploadkit && pnpm --filter @uploadkit/react typecheck && pnpm --filter @uploadkit/core typecheck</automated>
  </verify>
  <done>
    - UploadButton supports config.mode manual (two-step: select then upload) and auto (current behavior, default)
    - UploadDropzone supports config.mode manual (default, stage then submit) and auto (immediate upload)
    - onBeforeUploadBegin fires after validation, before upload, in both components
    - All elements in all 5 components have data-uk-element attributes
    - Stateful elements have data-state attributes with correct lifecycle values
    - Progress granularity coarse/fine/all throttles XHR progress events in proxy-client
    - All new props forwarded through UploadModal
    - New CSS styles for submit button and staged file display
    - TypeScript compiles cleanly
  </done>
</task>

<task type="auto">
  <name>Task 2: Infrastructure — NextSSRPlugin, withUk Tailwind wrapper, backend adapters</name>
  <files>
    packages/next/src/ssr-plugin.tsx
    packages/next/src/adapters/express.ts
    packages/next/src/adapters/fastify.ts
    packages/next/src/adapters/hono.ts
    packages/next/src/handler.ts
    packages/next/src/index.ts
    packages/next/package.json
    packages/next/tsup.config.ts
    packages/react/src/tailwind.ts
    packages/react/src/index.ts
    packages/react/package.json
    packages/react/tsup.config.ts
  </files>
  <action>
**2A. NextSSRPlugin**

Create `packages/next/src/ssr-plugin.tsx`:
```typescript
import type { FileRouter } from './types';
import { parseFileSize, getRouteConfig } from './router';

type ExtractedRouteConfig = {
  maxFileSize?: number;
  maxFileCount?: number;
  allowedTypes?: string[];
};

export function extractRouterConfig<TRouter extends FileRouter>(
  router: TRouter
): Record<string, ExtractedRouteConfig> {
  return Object.fromEntries(
    Object.entries(router).map(([key, route]) => [
      key,
      {
        ...(route.maxFileSize !== undefined
          ? { maxFileSize: parseFileSize(route.maxFileSize) }
          : {}),
        ...(route.maxFileCount !== undefined
          ? { maxFileCount: route.maxFileCount }
          : {}),
        ...(route.allowedTypes !== undefined
          ? { allowedTypes: route.allowedTypes }
          : {}),
      },
    ])
  );
}

type NextSSRPluginProps = {
  routerConfig: Record<string, ExtractedRouteConfig>;
};

export function NextSSRPlugin({ routerConfig }: NextSSRPluginProps) {
  return (
    <script
      type="application/json"
      id="__uploadkit-ssr"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(routerConfig),
      }}
    />
  );
}
```

Export `NextSSRPlugin` and `extractRouterConfig` from `packages/next/src/index.ts`.

Add `react` and `@types/react` to `packages/next/package.json`:
- `react` as peerDependency: `"react": ">=18"` (already implicitly required since Next.js requires React; making explicit since SSRPlugin is a React component)
- `@types/react` as devDependency

Add `'react'` to the `external` array in `packages/next/tsup.config.ts`.

**2B. Backend adapters**

CRITICAL: The `import 'server-only'` at line 1 of `handler.ts` must be removed. It prevents usage in Express/Fastify/Hono (non-Next.js Node.js environments). Instead, add a comment: `// Server-side only — do not import in browser code`.

Create `packages/next/src/adapters/` directory with three files:

`packages/next/src/adapters/express.ts`:
```typescript
import type { Request as ExpressReq, Response as ExpressRes, NextFunction } from 'express';
import type { FileRouter, UploadKitHandlerConfig } from '../types';
import { createUploadKitHandler } from '../handler';

export function createExpressHandler<TRouter extends FileRouter>(
  config: UploadKitHandlerConfig<TRouter>
) {
  const handler = createUploadKitHandler(config);

  return async (req: ExpressReq, res: ExpressRes, _next: NextFunction) => {
    const url = `${req.protocol}://${req.get('host') ?? 'localhost'}${req.originalUrl}`;
    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (typeof val === 'string') headers.set(key, val);
      else if (Array.isArray(val)) val.forEach((v) => headers.append(key, v));
    }

    const webReq = new Request(url, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD'
        ? JSON.stringify(req.body)
        : undefined,
    });

    // Extract route segments: Express route should be mounted like app.all('/api/uploadkit/*', handler)
    // req.params[0] contains everything after the wildcard
    const segments = (req.params[0] ?? req.params['uploadkit'] ?? '')
      .split('/').filter(Boolean);
    const routeParams = { params: Promise.resolve({ uploadkit: segments }) };

    const webRes = req.method === 'GET'
      ? await handler.GET(webReq, routeParams)
      : await handler.POST(webReq, routeParams);

    res.status(webRes.status);
    webRes.headers.forEach((value, key) => res.setHeader(key, value));
    const body = await webRes.text();
    res.setHeader('Content-Type', webRes.headers.get('Content-Type') ?? 'application/json');
    res.send(body);
  };
}
```

`packages/next/src/adapters/fastify.ts`:
```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { FileRouter, UploadKitHandlerConfig } from '../types';
import { createUploadKitHandler } from '../handler';

export function createFastifyHandler<TRouter extends FileRouter>(
  config: UploadKitHandlerConfig<TRouter>
) {
  const handler = createUploadKitHandler(config);

  return async (req: FastifyRequest<{ Params: { '*': string } }>, reply: FastifyReply) => {
    const url = `${req.protocol}://${req.hostname}${req.url}`;
    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (typeof val === 'string') headers.set(key, val);
      else if (Array.isArray(val)) val.forEach((v) => headers.append(key, v));
    }

    const webReq = new Request(url, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD'
        ? JSON.stringify(req.body)
        : undefined,
    });

    const segments = (req.params['*'] ?? '').split('/').filter(Boolean);
    const routeParams = { params: Promise.resolve({ uploadkit: segments }) };

    const webRes = req.method === 'GET'
      ? await handler.GET(webReq, routeParams)
      : await handler.POST(webReq, routeParams);

    const body = await webRes.text();
    return reply
      .status(webRes.status)
      .headers(Object.fromEntries(webRes.headers.entries()))
      .send(body);
  };
}
```

`packages/next/src/adapters/hono.ts`:
```typescript
import type { Context } from 'hono';
import type { FileRouter, UploadKitHandlerConfig } from '../types';
import { createUploadKitHandler } from '../handler';

export function createHonoHandler<TRouter extends FileRouter>(
  config: UploadKitHandlerConfig<TRouter>
) {
  const handler = createUploadKitHandler(config);

  return async (c: Context) => {
    // Hono uses Web Request/Response natively — minimal bridging needed
    const segments = (c.req.param('path') ?? c.req.path.split('/').slice(-1)[0] ?? '')
      .split('/').filter(Boolean);
    const routeParams = { params: Promise.resolve({ uploadkit: segments }) };

    return c.req.method === 'GET'
      ? handler.GET(c.req.raw, routeParams)
      : handler.POST(c.req.raw, routeParams);
  };
}
```

Add Express/Fastify/Hono types as optional devDependencies in `packages/next/package.json`:
```json
"devDependencies": {
  "@types/express": "latest",
  "fastify": "latest",
  "hono": "latest",
  ...existing
}
```

Update `packages/next/tsup.config.ts` entry points:
```typescript
entry: [
  'src/index.ts',
  'src/ssr-plugin.tsx',
  'src/adapters/express.ts',
  'src/adapters/fastify.ts',
  'src/adapters/hono.ts',
],
```

Add `'express'`, `'fastify'`, `'hono'` to the `external` array.

Add subpath exports to `packages/next/package.json`:
```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js",
    "require": "./dist/index.cjs"
  },
  "./ssr": {
    "types": "./dist/ssr-plugin.d.ts",
    "import": "./dist/ssr-plugin.js",
    "require": "./dist/ssr-plugin.cjs"
  },
  "./express": {
    "types": "./dist/adapters/express.d.ts",
    "import": "./dist/adapters/express.js",
    "require": "./dist/adapters/express.cjs"
  },
  "./fastify": {
    "types": "./dist/adapters/fastify.d.ts",
    "import": "./dist/adapters/fastify.js",
    "require": "./dist/adapters/fastify.cjs"
  },
  "./hono": {
    "types": "./dist/adapters/hono.d.ts",
    "import": "./dist/adapters/hono.js",
    "require": "./dist/adapters/hono.cjs"
  }
}
```

**2C. withUk Tailwind wrapper**

Create `packages/react/src/tailwind.ts`:
```typescript
type TailwindConfig = {
  content?: string[] | { relative?: boolean; files: string[] } | unknown;
  plugins?: unknown[];
  [key: string]: unknown;
};

export function withUk(config: TailwindConfig): TailwindConfig {
  const existingContent = Array.isArray(config.content) ? config.content : [];

  return {
    ...config,
    content: [
      ...existingContent,
      'node_modules/@uploadkit/react/dist/**/*.{js,mjs}',
    ],
    plugins: [
      ...(config.plugins ?? []),
      function uploadKitPlugin({ addVariant }: { addVariant: (name: string, definition: string) => void }) {
        // Element variants
        addVariant('uk-button', '&[data-uk-element="button"]');
        addVariant('uk-container', '&[data-uk-element="container"]');
        addVariant('uk-label', '&[data-uk-element="label"]');
        addVariant('uk-upload-icon', '&[data-uk-element="upload-icon"]');
        addVariant('uk-allowed-content', '&[data-uk-element="allowed-content"]');
        addVariant('uk-file-item', '&[data-uk-element="file-item"]');
        addVariant('uk-progress-bar', '&[data-uk-element="progress-bar"]');
        addVariant('uk-preview', '&[data-uk-element="preview"]');
        addVariant('uk-modal', '&[data-uk-element="modal"]');
        addVariant('uk-submit', '&[data-uk-element="submit-button"]');
        // State variants
        addVariant('uk-ready', '&[data-state="ready"]');
        addVariant('uk-idle', '&[data-state="idle"]');
        addVariant('uk-uploading', '&[data-state="uploading"]');
        addVariant('uk-success', '&[data-state="success"]');
        addVariant('uk-error', '&[data-state="error"]');
        addVariant('uk-dragging', '&[data-state="dragging"]');
      },
    ],
  };
}
```

Do NOT import `tailwindcss` types — use a local `TailwindConfig` type to avoid requiring tailwindcss as a dependency.

Add `withUk` export to `packages/react/src/index.ts`:
```typescript
export { withUk } from './tailwind';
```

Update `packages/react/tsup.config.ts` to include the tailwind entry:
```typescript
entry: ['src/index.ts', 'src/styles.css', 'src/tailwind.ts'],
```

Add subpath export to `packages/react/package.json`:
```json
"exports": {
  ".": { ... existing ... },
  "./styles.css": "./dist/styles.css",
  "./tailwind": {
    "types": "./dist/tailwind.d.ts",
    "import": "./dist/tailwind.mjs",
    "require": "./dist/tailwind.js"
  }
}
```
  </action>
  <verify>
    <automated>cd /Users/drumstock/Developer/GitHub/uploadkit && pnpm --filter @uploadkit/next typecheck && pnpm --filter @uploadkit/react typecheck</automated>
  </verify>
  <done>
    - NextSSRPlugin component renders hidden script tag with serialized router config
    - extractRouterConfig extracts maxFileSize/maxFileCount/allowedTypes from FileRouter
    - handler.ts no longer imports 'server-only' — works in Express/Fastify/Hono
    - Express adapter bridges Express req/res to Web Request/Response
    - Fastify adapter bridges Fastify req/reply to Web Request/Response
    - Hono adapter passes through native Web Request/Response
    - All adapters exported as subpath exports from @uploadkit/next
    - withUk Tailwind wrapper adds content path and custom uk-* variants
    - Tailwind wrapper exported from @uploadkit/react and @uploadkit/react/tailwind
    - TypeScript compiles cleanly for both packages
  </done>
</task>

<task type="auto">
  <name>Task 3: Build all packages, verify exports, run existing tests</name>
  <files>
    packages/core/src/proxy-client.ts
    packages/core/src/types.ts
  </files>
  <action>
**Build verification:**
1. Run `pnpm run build` from the monorepo root (or `pnpm turbo build`) to rebuild all packages.
2. Fix any build errors — common issues to watch for:
   - tsup may need `splitting: false` for the adapter entry points if tree-shaking causes issues with CJS output.
   - The SSR plugin uses JSX — ensure `packages/next/tsup.config.ts` does NOT have `jsx: 'transform'` set (tsup auto-detects .tsx).
   - If `server-only` removal causes build warnings in apps that import from `@uploadkit/next`, ignore them — the import was only needed for the Next.js bundler boundary enforcement, which is now unnecessary since the handler is server-side by nature.

**Export verification:**
3. After build, verify the dist outputs exist:
   - `packages/next/dist/ssr-plugin.js` and `.d.ts`
   - `packages/next/dist/adapters/express.js` and `.d.ts`
   - `packages/next/dist/adapters/fastify.js` and `.d.ts`
   - `packages/next/dist/adapters/hono.js` and `.d.ts`
   - `packages/react/dist/tailwind.mjs` and `.d.ts`

**Test verification:**
4. Run existing tests: `pnpm --filter @uploadkit/react test` and `pnpm --filter @uploadkit/core test` (if tests exist).
5. Fix any test failures caused by the changes (likely: data-status renamed to data-state, dropzone behavior change to manual mode default).

**ProxyUploadOptions update in core types:**
6. Ensure `packages/core/src/types.ts` exports a `ProgressGranularity` type if useful for consumers:
   ```typescript
   export type ProgressGranularity = 'coarse' | 'fine' | 'all';
   ```
   Export from `packages/core/src/index.ts`.

**Dashboard/web app build check:**
7. Run `pnpm turbo build` for the full monorepo to ensure apps that consume the SDK packages still build successfully. The `server-only` removal is the highest-risk change — if any app relied on it transitively, add `import 'server-only'` directly in the app's route handler file instead.
  </action>
  <verify>
    <automated>cd /Users/drumstock/Developer/GitHub/uploadkit && pnpm turbo build 2>&1 | tail -20</automated>
  </verify>
  <done>
    - All 3 SDK packages build cleanly (core, react, next)
    - All new subpath exports resolve to valid dist files
    - Existing tests pass (with adjustments for data-state rename and manual mode default)
    - Full monorepo builds without errors
    - No regressions in dashboard or web apps
  </done>
</task>

</tasks>

<verification>
1. `pnpm turbo build` succeeds for all packages
2. `pnpm --filter @uploadkit/react typecheck` passes
3. `pnpm --filter @uploadkit/next typecheck` passes
4. `pnpm --filter @uploadkit/react test` passes (if tests exist)
5. New dist files exist for all subpath exports (ssr, express, fastify, hono, tailwind)
</verification>

<success_criteria>
- All 7 features implemented: config.mode, onBeforeUploadBegin, data-uk-element/data-state, progress granularity, NextSSRPlugin, withUk, backend adapters
- Zero breaking changes to existing public API (new props are all optional)
- Two intentional behavior changes documented: dropzone defaults to manual mode, data-status renamed to data-state
- Full monorepo builds and existing tests pass
</success_criteria>
