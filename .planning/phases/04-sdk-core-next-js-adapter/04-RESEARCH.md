# Phase 4: SDK Core & Next.js Adapter — Research

**Researched:** 2026-04-08
**Domain:** TypeScript SDK design — zero-dependency upload client + Next.js App Router handler
**Confidence:** HIGH (all claims sourced from codebase inspection or project's existing researched stack)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `createUploadKit({ apiKey: 'uk_live_xxx', baseUrl?: 'https://api.uploadkit.dev' })` — minimal factory config
- **D-02:** Single `upload()` method handles single-file and multipart transparently (>10MB = multipart)
- **D-03:** Client-side upload progress via XMLHttpRequest — `upload.onprogress` fires `onProgress(percentage: number)` callbacks
- **D-04:** Retry with exponential backoff — `maxRetries` default 3, retries on 5xx/429 only, `AbortController` for cancellation
- **D-05:** BYOS at handler level only (`@uploadkit/next`), not at factory level. `@uploadkit/core` never knows about BYOS credentials
- **D-06:** BYOS supports S3-compatible providers only. Single `S3CompatibleStorage` interface: `endpoint`, `region`, `accessKeyId`, `secretAccessKey`, `bucket`
- **D-07:** Export `AppFileRouter` type from route.ts. Client uses `generateReactHelpers<AppFileRouter>()` — same pattern as UploadThing
- **D-08:** Type inference covers route names AND per-route config (maxFileSize, allowedTypes, maxFileCount)
- **D-09:** ESM + CJS dual output via tsup (already scaffolded). `sideEffects: false`
- **D-10:** React + Next.js as `peerDependencies`. `@uploadkit/core` is framework-agnostic (no react peer dep on core itself). `@uploadkit/next` has `next` as peer dep

### Claude's Discretion

- Internal upload state machine design
- XHR wrapper implementation details
- Multipart chunking algorithm
- TypeScript generics architecture for fileRouter inference
- `@uploadkit/core` internal module structure
- Error handling and error types exported from core
- BYOS S3Client initialization pattern within the handler

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SDK-01 | `createUploadKit` factory with API key config (managed mode) | Factory pattern, TypeScript generics, API contract with `POST /api/v1/upload/request` |
| SDK-02 | Programmatic upload with file, route, metadata, onProgress callback | XHR `upload.onprogress`, single-upload API contract documented in codebase |
| SDK-03 | Multipart upload transparent to consumer | Multipart API endpoints (`/multipart/init`, `/multipart/complete`, `/multipart/abort`) fully implemented in codebase; 5MB part size, concurrent part upload |
| SDK-04 | `listFiles` and `deleteFile` methods | REST API for files CRUD already implemented; SDK wraps HTTP calls |
| SDK-05 | BYOS mode — identical SDK API, server-side presigned URL generation | BYOS at handler level only; `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` for server-side presign |
| SDK-06 | Zero external dependencies, tree-shakeable ESM + CJS via tsup | tsup config already scaffolded in both packages; `external: []` in core config means zero bundled deps |
| NEXT-01 | `createUploadKitHandler` producing GET/POST route handlers | Next.js App Router `{ GET, POST }` export pattern |
| NEXT-02 | File Router pattern with typed routes | `satisfies FileRouter` constraint + TypeScript mapped types for inference |
| NEXT-03 | Middleware function receives request, returns metadata attached to upload | Middleware return type flows into `onUploadComplete` via generic inference |
| NEXT-04 | End-to-end TypeScript inference from fileRouter to client components | `generateReactHelpers<AppFileRouter>()` pattern — mapped types on route keys |
| NEXT-05 | BYOS configuration at handler level | `storage: S3CompatibleStorage` block in `createUploadKitHandler` config |
</phase_requirements>

---

## Summary

Phase 4 implements the two npm packages that developers install. `@uploadkit/core` is the zero-dependency HTTP client that orchestrates the presigned URL flow, multipart upload, retry, and progress tracking. `@uploadkit/next` is the server-side handler factory that wraps a developer's file router definition into a Next.js App Router `{ GET, POST }` export, and provides BYOS credential isolation.

The API contract is fully implemented and verified in `apps/api` — all endpoints, request shapes, and response shapes are known. The SDK is essentially a typed HTTP client over this existing API. The hardest engineering problems are: (1) the XHR-based upload with `upload.onprogress`, which fetch cannot provide, (2) concurrent multipart part uploads with per-part ETag collection, and (3) the TypeScript generics that flow middleware return types into `onUploadComplete` callbacks and route names into client component props.

The tsup build infrastructure is already scaffolded in both packages from Phase 1. The packages are empty stubs — all that is missing is the implementation.

**Primary recommendation:** Build `@uploadkit/core` first as a pure TypeScript HTTP client with no bundled deps. Then build `@uploadkit/next` as a thin handler wrapper that adds the file router pattern, `@aws-sdk` BYOS integration, and type inference layer on top.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tsup | 8.5.0 | Dual ESM+CJS bundle with `.d.ts` | Already scaffolded in Phase 1; esbuild-based, zero-config for this setup |
| TypeScript | 5.x (latest) | Type safety + inference | Project constraint; strict mode + `exactOptionalPropertyTypes: true` |
| `@aws-sdk/client-s3` | 3.x (~3.1023) | BYOS S3Client in `@uploadkit/next` | S3-compatible; works with R2, MinIO, DigitalOcean Spaces |
| `@aws-sdk/s3-request-presigner` | 3.x (~3.1023) | BYOS server-side presigned PUT generation | Standard presigned URL flow; same lib used in `apps/api` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@uploadkit/shared` | workspace:* | `UploadKitError`, `UploadFile` type, constants | Import in core for error classes — do not duplicate |
| `server-only` | latest | Enforce server/client boundary in `@uploadkit/next` | Import in any file that must never reach the browser bundle |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| XHR for upload | fetch | fetch has no `upload.onprogress` equivalent; XHR is the only native browser API with upload progress events. XHR is the correct choice per D-03. |
| Concurrent multipart with manual concurrency | `p-limit` | p-limit is a dep; manual concurrency with a running counter is trivial at 3-5 concurrent slots and keeps core zero-dep |
| `@aws-sdk/client-s3` in `@uploadkit/next` | Custom S3 presigner | AWS SDK v3 is already used in `apps/api`; devs provide S3-compatible credentials; no reason to hand-roll |

**Installation for `@uploadkit/next`:**
```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner server-only
```

`@uploadkit/core` adds NO runtime dependencies — zero deps policy.

---

## API Contract (Verified from Codebase)

The SDK calls these endpoints. All shapes are verified from `apps/api/src/lib/schemas.ts` and the route files.

### Single Upload Flow

**Step 1 — Request presigned URL**
```
POST /api/v1/upload/request
Authorization: Bearer uk_live_xxx
{
  fileName: string,      // max 255 chars
  fileSize: number,      // bytes, integer
  contentType: string,   // MIME type
  routeSlug: string,     // file router slug
  metadata?: Record<string, unknown>
}
→ 200: { fileId: string, uploadUrl: string, key: string, cdnUrl: string }
→ 400/403/401/429: { error: { type, code, message, suggestion? } }
```

**Step 2 — PUT file bytes to presigned URL**
- Direct PUT to `uploadUrl` (R2/S3 presigned URL)
- Must include `Content-Type` header matching the signed value (403 if mismatched)
- Must include `Content-Length` header (locked into signature)
- Use XHR `upload.onprogress` for progress events

**Step 3 — Confirm upload complete**
```
POST /api/v1/upload/complete
Authorization: Bearer uk_live_xxx
{
  fileId: string,
  metadata?: Record<string, unknown>
}
→ 200: { file: { id, key, name, size, type, url, status, metadata, createdAt } }
```

### Multipart Upload Flow (files > 10MB)

**Step 1 — Initialize multipart**
```
POST /api/v1/upload/multipart/init
Authorization: Bearer uk_live_xxx
{ fileName, fileSize, contentType, routeSlug, metadata? }
→ 200: {
  fileId: string,
  uploadId: string,
  key: string,
  parts: Array<{ partNumber: number, uploadUrl: string }>
}
```
Note: Server returns ALL presigned part URLs up-front. Part size is 5MB. Number of parts = `Math.ceil(fileSize / (5 * 1024 * 1024))`. The server rejects `fileSize <= 10MB` with `FILE_TOO_SMALL_FOR_MULTIPART`.

**Step 2 — PUT each part concurrently**
- Each part PUT to its `uploadUrl`
- Must capture `ETag` response header per part for the complete call
- Parts are 1-indexed (partNumber starts at 1)

**Step 3 — Complete multipart**
```
POST /api/v1/upload/multipart/complete
Authorization: Bearer uk_live_xxx
{
  fileId: string,
  uploadId: string,
  parts: Array<{ partNumber: number, etag: string }>,
  metadata?: Record<string, unknown>
}
→ 200: { file: { id, key, name, size, type, url, status, metadata, createdAt } }
```

**Abort multipart (on error or cancel)**
```
POST /api/v1/upload/multipart/abort
Authorization: Bearer uk_live_xxx
{ fileId: string, uploadId: string }
→ 200: { ok: true }
```

### Files CRUD (for listFiles/deleteFile)

```
GET  /api/v1/files?limit=50&cursor=xxx   → { files: UploadFile[], nextCursor? }
GET  /api/v1/files/:key                  → { file: UploadFile }
DELETE /api/v1/files/:key                → { ok: true }
```

---

## Architecture Patterns

### Recommended Module Structure for `@uploadkit/core`

```
packages/core/src/
├── index.ts          # Public exports: createUploadKit, UploadKitError, types
├── client.ts         # UploadKitClient class — factory entry point
├── upload.ts         # upload() — single/multipart decision + orchestration
├── single.ts         # singleUpload() — XHR PUT + onProgress + retry
├── multipart.ts      # multipartUpload() — concurrent parts + ETag collection
├── retry.ts          # withRetry() — exponential backoff, 5xx/429 only
├── validation.ts     # Client-side file type/size check before API call
├── http.ts           # fetchApi() — typed fetch wrapper for API calls
└── types.ts          # SDK-level types: UploadKitConfig, UploadOptions, UploadResult
```

### Recommended Module Structure for `@uploadkit/next`

```
packages/next/src/
├── index.ts          # Re-exports: createUploadKitHandler, FileRouter, types
├── handler.ts        # createUploadKitHandler() — returns { GET, POST }
├── router.ts         # FileRouter type definition + route builder helpers
├── byos.ts           # BYOS presigned URL generation using @aws-sdk
├── types.ts          # FileRouterDef, MiddlewareFn, RouteConfig types
└── helpers.ts        # generateReactHelpers<TRouter>() — typed component factory
```

### Pattern 1: The `upload()` Decision Gateway

**What:** A single `upload()` method that checks file size and delegates to either the single-upload path or multipart path. Consumer never knows which path was taken.

```typescript
// Source: CONTEXT.md D-02, UPLOADKIT-GSD.md §3.1
async upload({ file, route, metadata, onProgress }: UploadOptions): Promise<UploadResult> {
  const MULTIPART_THRESHOLD = 10 * 1024 * 1024; // 10MB — matches API server

  if (file.size > MULTIPART_THRESHOLD) {
    return this.multipartUpload({ file, route, metadata, onProgress });
  }
  return this.singleUpload({ file, route, metadata, onProgress });
}
```

### Pattern 2: XHR Upload with Progress

**What:** XHR is the only browser API that exposes `upload.onprogress`. Wrap in a Promise for async/await ergonomics.

```typescript
// Source: CONTEXT.md D-03
function xhrPut(url: string, file: File, onProgress?: (pct: number) => void): Promise<{ etag: string | null }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.setRequestHeader('Content-Length', String(file.size));

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ etag: xhr.getResponseHeader('ETag') });
      } else {
        reject(new Error(`PUT failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
}
```

**Critical:** R2 presigned PUT URLs require `Content-Type` to match the value locked into the signature. Mismatch returns 403 with no useful error body.

**Critical:** CORS on the R2 bucket must include `ETag` in `ExposeHeaders` for multipart uploads. This was configured in Phase 1 (INFRA-05). The SDK can read `xhr.getResponseHeader('ETag')` only if the bucket exposes it.

### Pattern 3: Exponential Backoff Retry

**What:** Wrap any async operation with configurable retry. Only retry on 5xx and 429 — never on 4xx client errors.

```typescript
// Source: CONTEXT.md D-04
async function withRetry<T>(
  fn: () => Promise<T>,
  { maxRetries = 3, signal }: { maxRetries?: number; signal?: AbortSignal } = {}
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (signal?.aborted) throw new Error('Upload aborted');
      const status = (err as any)?.statusCode;
      const isRetryable = status >= 500 || status === 429;
      if (!isRetryable || attempt >= maxRetries) throw err;
      const delay = Math.min(1000 * 2 ** attempt + Math.random() * 200, 30000);
      await new Promise(r => setTimeout(r, delay));
      attempt++;
    }
  }
}
```

### Pattern 4: Concurrent Multipart Part Uploads

**What:** Upload N parts simultaneously using a manual concurrency slot counter. 3 concurrent slots by default — empirically safe for R2 and S3 without hitting connection limits.

```typescript
// Source: CONTEXT.md specifics — "3-5 concurrent"
async function uploadParts(
  parts: Array<{ partNumber: number; uploadUrl: string; slice: Blob }>,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
): Promise<Array<{ partNumber: number; etag: string }>> {
  const CONCURRENCY = 3;
  const results: Array<{ partNumber: number; etag: string }> = [];
  let completed = 0;

  // Process in windows of CONCURRENCY
  for (let i = 0; i < parts.length; i += CONCURRENCY) {
    if (signal?.aborted) throw new Error('Upload aborted');
    const batch = parts.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (part) => {
        const { etag } = await xhrPut(part.uploadUrl, part.slice as any);
        completed++;
        onProgress?.(Math.round((completed / parts.length) * 100));
        if (!etag) throw new Error(`Missing ETag for part ${part.partNumber}`);
        return { partNumber: part.partNumber, etag };
      })
    );
    results.push(...batchResults);
  }
  return results;
}
```

### Pattern 5: FileRouter Type Inference

**What:** The `FileRouter` type is a record of route names to route configs. Using `satisfies` in the developer's app constrains the object while preserving the literal types needed for inference. `createUploadKitHandler` accepts a generic `TRouter extends FileRouter` and returns a handler that carries the router type forward.

```typescript
// Source: CONTEXT.md D-07, D-08, UPLOADKIT-GSD.md §3.3
// In @uploadkit/next:

export type RouteConfig = {
  maxFileSize?: string | number;
  maxFileCount?: number;
  allowedTypes?: string[];
  middleware?: (ctx: { req: Request }) => Promise<Record<string, unknown>>;
  onUploadComplete?: (args: { file: UploadedFile; metadata: Record<string, unknown> }) => Promise<unknown>;
};

export type FileRouter = Record<string, RouteConfig>;

// Developer's app:
const fileRouter = {
  imageUploader: { maxFileSize: '4MB', allowedTypes: ['image/*'], ... },
  documentUploader: { maxFileSize: '16MB', ... },
} satisfies FileRouter;

export type AppFileRouter = typeof fileRouter;

// Client component usage after generateReactHelpers<AppFileRouter>():
<UploadButton route="imageUploader" />  // ✓ — keyof AppFileRouter
<UploadButton route="foobar" />         // ✗ — TypeScript error
```

**TypeScript note:** The `satisfies` keyword (TS 4.9+) is the correct tool here. It enforces shape compatibility while preserving the literal object type for `typeof`. Using a type annotation (`const fileRouter: FileRouter = ...`) would widen the type to `FileRouter`, losing the literal route name keys needed for inference.

### Pattern 6: Middleware Return Type Flow

**What:** The trickiest TypeScript problem — the return type of a route's `middleware` function must flow into the `metadata` parameter of `onUploadComplete` in a type-safe way. This requires a generic on `RouteConfig` itself.

```typescript
// In @uploadkit/next types.ts:
export type RouteConfig<TMiddlewareMeta extends Record<string, unknown> = Record<string, unknown>> = {
  allowedTypes?: string[];
  maxFileSize?: string | number;
  maxFileCount?: number;
  middleware?: (ctx: { req: Request }) => Promise<TMiddlewareMeta>;
  onUploadComplete?: (args: { file: UploadedFile; metadata: TMiddlewareMeta }) => Promise<unknown>;
};
```

When a developer defines middleware returning `{ userId: string }`, TypeScript can infer `TMiddlewareMeta = { userId: string }` and type-check the `onUploadComplete` callback accordingly.

### Pattern 7: createUploadKitHandler → GET + POST Handlers

**What:** The GET handler returns the router's config (used by client SDK to know route constraints). The POST handler receives the upload completion notification from the client.

```typescript
// Source: UPLOADKIT-GSD.md §3.3
export function createUploadKitHandler<TRouter extends FileRouter>(config: {
  apiKey: string;
  router: TRouter;
  storage?: S3CompatibleStorage;
}): { GET: NextRouteHandler; POST: NextRouteHandler } {
  return {
    GET: async (req: Request, { params }: { params: { uploadkit: string[] } }) => {
      // Return route config for the requested slug
      const slug = params.uploadkit?.[0];
      const route = config.router[slug];
      if (!route) return new Response(null, { status: 404 });
      return Response.json({ maxFileSize: route.maxFileSize, allowedTypes: route.allowedTypes, maxFileCount: route.maxFileCount });
    },
    POST: async (req: Request, { params }: { params: { uploadkit: string[] } }) => {
      // Receive upload-complete notification: run middleware → call onUploadComplete
      const slug = params.uploadkit?.[0];
      // ... run middleware, call onUploadComplete, return metadata
    },
  };
}
```

The route is placed at `app/api/uploadkit/[...uploadkit]/route.ts` in the developer's Next.js app. The catch-all segment `[...uploadkit]` handles all routes via a single file.

### Anti-Patterns to Avoid

- **Bundling `@aws-sdk` into `@uploadkit/core`:** Core is zero-dep. AWS SDK goes only in `@uploadkit/next` for BYOS. [VERIFIED: codebase — tsup.config.ts for core has `external: []` intentionally]
- **Using fetch for the PUT-to-presigned-URL step:** Fetch has no upload progress API. Always use XHR for the actual file PUT. [VERIFIED: codebase D-03]
- **Sending `Content-Type` that doesn't match the presigned value:** R2 will return 403. The SDK must send the same MIME type it declared when requesting the presigned URL. [VERIFIED: codebase — apps/api/src/lib/presign.ts locks ContentType into signature]
- **Treating all HTTP errors as retryable:** Only 5xx and 429 are transient. 4xx errors (type mismatch, tier limit, bad API key) are permanent — retrying them burns quota and delays user feedback. [VERIFIED: CONTEXT.md D-04]
- **Using default exports:** All SDK exports must be named exports for tree-shaking. [VERIFIED: STACK.md — "No default exports in the SDK packages"]
- **Using `import type AppFileRouter` in client code (wrong import style):** The `AppFileRouter` type must come from the server route file. Client must use `import type` to prevent server code leaking into the bundle.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| BYOS presigned URL generation | Custom S3 signing logic | `@aws-sdk/s3-request-presigner` | SigV4 signing has time-based expiry, canonical headers, edge cases with special characters in keys — `getSignedUrl()` handles all of this |
| Server boundary enforcement | Runtime checks | `server-only` package | Compile-time import error if server code is accidentally imported in client bundle |
| ETag parsing from XHR response | Regex on raw headers | `xhr.getResponseHeader('ETag')` | ETags can be quoted strings (`"abc123"`) or unquoted; R2 returns them quoted; don't strip quotes — pass verbatim to multipart complete |

**Key insight:** The multipart flow requires ETags verbatim from the response headers — do not strip the surrounding quotes. R2's `CompleteMultipartUpload` requires them as-is, and the API already passes them through: `Parts: parts.map(p => ({ PartNumber: p.partNumber, ETag: p.etag }))`.

---

## Common Pitfalls

### Pitfall 1: Content-Type Mismatch on Presigned PUT

**What goes wrong:** SDK sends a PUT with a different `Content-Type` than was declared in the presign request. R2 returns 403.
**Why it happens:** Developer code changes the MIME type between the presign call and the actual upload, or the SDK uses a default Content-Type.
**How to avoid:** The SDK must pass the same `file.type` (from the `File` object) to both the API request and the XHR header.
**Warning signs:** Sporadic 403s on upload that look like auth failures but aren't.

### Pitfall 2: Missing ETag from XHR Response

**What goes wrong:** `xhr.getResponseHeader('ETag')` returns null for multipart parts. The multipart complete call fails.
**Why it happens:** R2/S3 includes ETag in response headers, but browsers block access to it unless the server includes `ETag` in `Access-Control-Expose-Headers`.
**How to avoid:** Phase 1 configured R2 CORS with `ETag` in `ExposeHeaders`. The SDK should throw a clear error if ETag is null, not pass null silently.
**Warning signs:** `Missing ETag for part N` error. Fix is in CORS config (infrastructure), not SDK.

### Pitfall 3: AbortController Scope

**What goes wrong:** Aborting an upload cancels the XHR but leaves the File record in `UPLOADING` state in the server. For multipart, the in-progress R2 multipart upload also remains open, accumulating billable storage.
**Why it happens:** AbortController only stops the client-side operation.
**How to avoid:** On abort, always call `POST /api/v1/upload/multipart/abort` to clean up. For single uploads, a cleanup job on the server handles stale `UPLOADING` records (Phase 3, UPLD-09).

### Pitfall 4: File.slice() for Multipart Parts

**What goes wrong:** Using `file.slice(start, end)` returns a `Blob`, not a `File`. XHR accepts both, but the Content-Length must be calculated per-part from the slice size, not the total file size.
**Why it happens:** Part sizes are `5MB` except the last part which is `fileSize % PART_SIZE`.
**How to avoid:** Calculate part slices: `const slice = file.slice(start, Math.min(start + PART_SIZE, file.size))`. Content-Length for each XHR is `slice.size`.

### Pitfall 5: TypeScript `satisfies` vs Type Annotation

**What goes wrong:** Developer writes `const fileRouter: FileRouter = { imageUploader: { ... } }` instead of `satisfies`. The type of `fileRouter` becomes `FileRouter` (wide), and `typeof fileRouter` loses the literal route name keys. `generateReactHelpers<AppFileRouter>()` produces components typed as `{ route: string }` instead of `{ route: 'imageUploader' | 'documentUploader' }`.
**Why it happens:** Type annotation is more familiar than `satisfies`.
**How to avoid:** Documentation and error messages must guide developers to `satisfies FileRouter`. The `FileRouter` type should be exported from `@uploadkit/next` with a clear JSDoc comment.

### Pitfall 6: `@uploadkit/next` Imported in Client Components

**What goes wrong:** Developer imports `createUploadKitHandler` or other server-only code in a Next.js Client Component. Build fails with cryptic errors about `fs`, `crypto`, or AWS SDK modules not found.
**Why it happens:** No boundary enforcement without explicit import.
**How to avoid:** Add `import 'server-only'` at the top of `handler.ts` and any file containing `@aws-sdk` imports.

---

## Code Examples

### createUploadKit Factory (complete public surface)

```typescript
// Source: UPLOADKIT-GSD.md §3.1, CONTEXT.md D-01/D-02/D-04
import { createUploadKit } from '@uploadkit/core';

const uploadkit = createUploadKit({
  apiKey: 'uk_live_xxx',
  baseUrl: 'https://api.uploadkit.dev', // optional
});

// Single upload (< 10MB — automatic)
const result = await uploadkit.upload({
  file: fileObject,
  route: 'imageUploader',
  metadata: { userId: '123' },
  onProgress: (pct) => console.log(`${pct}%`),
});
// result: { id, key, name, size, type, url, status, metadata, createdAt }

// Multipart upload (> 10MB — also automatic, same API)
const bigResult = await uploadkit.upload({ file: bigFile, route: 'documentUploader' });

// Cancel in-flight upload
const controller = new AbortController();
uploadkit.upload({ file, route, signal: controller.signal });
controller.abort();

// List files
const { files, nextCursor } = await uploadkit.listFiles({ limit: 20 });

// Delete file
await uploadkit.deleteFile('projectId/routeSlug/nanoid/filename.jpg');
```

### createUploadKitHandler (developer's Next.js app)

```typescript
// Source: UPLOADKIT-GSD.md §3.3, CONTEXT.md D-05/D-06
// apps/my-next-app/app/api/uploadkit/[...uploadkit]/route.ts
import { createUploadKitHandler } from '@uploadkit/next';
import type { FileRouter } from '@uploadkit/next';

const fileRouter = {
  imageUploader: {
    maxFileSize: '4MB',
    maxFileCount: 4,
    allowedTypes: ['image/*'],
    middleware: async ({ req }) => {
      const user = await getUser(req);
      if (!user) throw new Error('Unauthorized');
      return { userId: user.id }; // typed into onUploadComplete
    },
    onUploadComplete: async ({ file, metadata }) => {
      // metadata.userId is typed as string
      await db.user.update(metadata.userId, { avatar: file.url });
    },
  },
} satisfies FileRouter;

export type AppFileRouter = typeof fileRouter;
export const { GET, POST } = createUploadKitHandler({ router: fileRouter });
```

### BYOS Mode

```typescript
// Source: CONTEXT.md D-05/D-06
export const { GET, POST } = createUploadKitHandler({
  router: fileRouter,
  storage: {
    provider: 's3',
    endpoint: 'https://xxx.r2.cloudflarestorage.com', // for R2
    region: 'auto',
    bucket: process.env.MY_BUCKET!,
    accessKeyId: process.env.MY_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MY_SECRET_ACCESS_KEY!,
  },
});
```

### generateReactHelpers (end-to-end type inference)

```typescript
// Source: UPLOADKIT-GSD.md §3.3, CONTEXT.md D-07/D-08
// lib/uploadkit.ts — client-side helpers file
import { generateReactHelpers } from '@uploadkit/react';
import type { AppFileRouter } from '@/app/api/uploadkit/route';

export const { UploadButton, UploadDropzone, useUploadKit } =
  generateReactHelpers<AppFileRouter>();

// Usage in a component:
<UploadButton route="imageUploader" />  // ✅ typed
<UploadButton route="foobar" />         // ❌ TypeScript error: "foobar" not in AppFileRouter
```

Note: `generateReactHelpers` is exported from `@uploadkit/react` (Phase 5), but its type must be defined and tested in `@uploadkit/next` Phase 4, because the generic `TRouter` type flows from `AppFileRouter`. The Phase 4 deliverable includes the `generateReactHelpers` type signature and a no-op implementation that Phase 5 fills in.

---

## Package Configuration Notes

### `@uploadkit/core` — Verified from codebase

```json
// packages/core/package.json — current state
{
  "sideEffects": false,
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "peerDependencies": {} // stays empty — core is zero-dep
}
```

The tsup config has `external: []` — correct. `@uploadkit/shared` should be listed in `dependencies` (not just devDeps) since it's consumed at build time for types AND at runtime for the `UploadKitError` class. Verify whether shared is bundled in or external.

Decision required: should `@uploadkit/shared` be bundled into `@uploadkit/core`'s dist or listed as a peer/regular dep? Since `@uploadkit/shared` is also zero-dep and very small, bundling it in is safe and avoids a transitive install for SDK consumers. Add it to `external: []`... actually keep it OUT of external so tsup bundles it. Alternatively, list it as a regular dep. [ASSUMED — planner should confirm bundling vs. external shared]

### `@uploadkit/next` — Verified from codebase

```json
// packages/next/package.json — current state
{
  "dependencies": { "@uploadkit/core": "workspace:*" },
  "peerDependencies": { "next": ">=14" }
}
```

Needs addition: `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` as regular dependencies (not peer — the BYOS feature requires them). The tsup config already marks `next`, `react`, and `@uploadkit/core` as external. AWS SDK should also be external (it will be a regular dep so npm installs it, but tsup should not bundle it).

Updated `tsup.config.ts` for next:
```typescript
external: ['next', 'react', '@uploadkit/core', '@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', 'server-only']
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `type AppFileRouter = ...` (type alias) | `satisfies FileRouter` (preserves literal types) | TypeScript 4.9 (Nov 2022) | `satisfies` preserves the literal route name keys needed for inference; type alias widens to `FileRouter` |
| Sequential multipart part uploads | Concurrent part uploads (3-5 parallel) | Standard since S3 multipart was introduced | 3x+ faster for large files |
| `fetch` for upload progress | XHR `upload.onprogress` | Still current in 2026 — Fetch API still has no upload progress event | Cannot be replaced with fetch today |
| Default exports from SDK packages | Named exports only | Industry convention post-2021 | Enables tree-shaking; bundlers can eliminate unused exports |

**Deprecated/outdated:**
- Pages Router in Next.js: The `@uploadkit/next` handler is App Router only (v1 constraint). Pages Router API routes use `req`/`res` signatures incompatible with this design.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@uploadkit/shared` should be bundled into `@uploadkit/core` dist (not listed as external/peer) | Package Configuration Notes | If listed as peer, SDK consumers must install it separately — worse DX. If listed as regular dep with tsup bundling, it works but produces larger dist. |
| A2 | `generateReactHelpers` type signature should be defined in `@uploadkit/next` Phase 4 with a stub implementation, full implementation in Phase 5 | Code Examples | If deferred entirely to Phase 5, Phase 5 loses the type definition anchor from Phase 4 |

---

## Open Questions

1. **Should `@uploadkit/shared` be bundled into `@uploadkit/core` or listed as a dependency?**
   - What we know: Shared is zero-dep and small; the `UploadKitError` class is needed at runtime in core
   - What's unclear: Whether SDK consumers should see `@uploadkit/shared` in their `node_modules`
   - Recommendation: Bundle it in via tsup (remove from `external` list). This avoids a transitive public package.

2. **Does `@uploadkit/next`'s BYOS handler generate presigned URLs locally (server-side, developer's creds) and BYPASS the UploadKit API, or does it still call the UploadKit API for usage accounting?**
   - What we know from CONTEXT.md: "The `@uploadkit/core` client doesn't know about BYOS — it just talks to presigned URLs." ARCHITECTURE.md: "Usage metering still goes through UploadKit API with developer's API key, but actual bytes never touch UploadKit infrastructure."
   - What's unclear: In BYOS mode, does `createUploadKitHandler` generate the presigned URL locally using the developer's S3 creds, then return it to the client? Or does it still forward to `apps/api`?
   - Recommendation: BYOS mode generates presigned URLs server-side using developer's credentials (in `@uploadkit/next` handler) and still calls UploadKit API for metadata/usage accounting. The presign step is local; the complete step hits the API.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 4 is a pure code implementation phase. No external services or CLI tools need to be installed. The `@aws-sdk` packages will be added as dependencies and installed via pnpm. The R2 bucket and API are already running from prior phases.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `packages/core/vitest.config.ts` (Wave 0 gap — does not exist yet) |
| Quick run command | `pnpm --filter @uploadkit/core test` |
| Full suite command | `pnpm --filter @uploadkit/core test && pnpm --filter @uploadkit/next test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SDK-01 | `createUploadKit()` returns client with upload/listFiles/deleteFile methods | unit | `pnpm --filter @uploadkit/core test -- client` | ❌ Wave 0 |
| SDK-02 | `upload()` calls presign API, then XHR PUT, then complete API | unit (mock XHR + fetch) | `pnpm --filter @uploadkit/core test -- upload` | ❌ Wave 0 |
| SDK-03 | `upload()` uses multipart path for files >10MB; assembles parts + ETags | unit | `pnpm --filter @uploadkit/core test -- multipart` | ❌ Wave 0 |
| SDK-04 | `listFiles()` and `deleteFile()` call correct API endpoints | unit | `pnpm --filter @uploadkit/core test -- files` | ❌ Wave 0 |
| SDK-05 | BYOS handler generates presigned URLs using dev's S3 creds (not UploadKit API) | unit (mock S3Client) | `pnpm --filter @uploadkit/next test -- byos` | ❌ Wave 0 |
| SDK-06 | `@uploadkit/core` dist has zero external deps in package.json | build verification | `pnpm --filter @uploadkit/core build && node -e "require('./dist/index.cjs')"` | ❌ Wave 0 |
| NEXT-01 | `createUploadKitHandler` returns `{ GET, POST }` functions | unit | `pnpm --filter @uploadkit/next test -- handler` | ❌ Wave 0 |
| NEXT-02 | Route config (maxFileSize, allowedTypes) flows correctly into handler GET response | unit | `pnpm --filter @uploadkit/next test -- router` | ❌ Wave 0 |
| NEXT-03 | Middleware return value passed as metadata to onUploadComplete | unit | `pnpm --filter @uploadkit/next test -- middleware` | ❌ Wave 0 |
| NEXT-04 | TypeScript: route name typo on `UploadButton` causes compile error | type-check (tsc --noEmit) | `pnpm --filter @uploadkit/next typecheck` | ❌ Wave 0 |
| NEXT-05 | BYOS: S3Client initialized with developer's creds, presigned URL generated locally | unit (mock S3Client) | `pnpm --filter @uploadkit/next test -- byos` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @uploadkit/core test && pnpm --filter @uploadkit/next test`
- **Per wave merge:** Full suite above + `pnpm --filter @uploadkit/core build && pnpm --filter @uploadkit/next build`
- **Phase gate:** Both packages build clean + all tests pass before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `packages/core/vitest.config.ts` — test runner config (mirror `packages/shared/vitest.config.ts`)
- [ ] `packages/core/tests/client.test.ts` — createUploadKit factory tests (SDK-01)
- [ ] `packages/core/tests/upload.test.ts` — single + multipart upload tests (SDK-02, SDK-03)
- [ ] `packages/core/tests/files.test.ts` — listFiles + deleteFile (SDK-04)
- [ ] `packages/core/tests/retry.test.ts` — retry logic unit tests (SDK-02)
- [ ] `packages/next/vitest.config.ts` — test runner config
- [ ] `packages/next/tests/handler.test.ts` — createUploadKitHandler (NEXT-01, NEXT-02, NEXT-03)
- [ ] `packages/next/tests/byos.test.ts` — BYOS S3Client init (NEXT-05)

---

## Project Constraints (from CLAUDE.md)

- **MongoDB/Mongoose** — not applicable to this phase (SDK is client-side)
- **Cloudflare R2 (S3-compatible)** — SDK calls presigned URLs; BYOS supports any S3-compatible endpoint
- **Auth.js v5** — not applicable to this phase
- **Stripe** — not applicable to this phase
- **Versions: always latest stable** — `pnpm add package@latest`
- **SDK design: tree-shakeable, dark mode native, CSS custom properties** — core and next have no UI; tree-shaking ensured by named exports + `sideEffects: false`
- **Security: BYOS credentials never exposed to browser** — `server-only` import in all files containing `@aws-sdk` or credentials handling
- **Naming: API keys prefixed `uk_live_` / `uk_test_`** — SDK client validates this prefix before making API calls (client-side defensive check)
- **Accessibility: WCAG 2.1 AA** — not applicable to this phase (no UI components)
- **No default exports** — all SDK exports are named

---

## Sources

### Primary (HIGH confidence)
- `apps/api/src/app/api/v1/upload/request/route.ts` — API contract for single upload request/complete
- `apps/api/src/app/api/v1/upload/multipart/init/route.ts` — multipart init API contract
- `apps/api/src/app/api/v1/upload/multipart/complete/route.ts` — multipart complete API contract
- `apps/api/src/app/api/v1/upload/multipart/abort/route.ts` — abort API contract
- `apps/api/src/lib/schemas.ts` — exact Zod schemas for all API endpoints
- `packages/core/package.json` + `tsup.config.ts` — existing build config
- `packages/next/package.json` + `tsup.config.ts` — existing build config
- `packages/shared/src/errors.ts` — UploadKitError class hierarchy for SDK re-use
- `packages/shared/src/types.ts` — UploadFile, FileRouterConfig types
- `.planning/phases/04-sdk-core-next-js-adapter/04-CONTEXT.md` — all locked decisions
- `.planning/research/STACK.md` — tsup 8.5.0, TypeScript 5.x, AWS SDK v3 versions
- `.planning/research/ARCHITECTURE.md` — SDK three-tier architecture, BYOS design

### Secondary (MEDIUM confidence)
- `UPLOADKIT-GSD.md §3.1-3.3` — Public API design, fileRouter pattern, generateReactHelpers pattern

### Tertiary (LOW confidence — ASSUMED)
- A1: `@uploadkit/shared` bundling decision — planner should confirm
- A2: `generateReactHelpers` stub in Phase 4 vs full deferral to Phase 5

---

## Metadata

**Confidence breakdown:**
- API contract: HIGH — sourced directly from implemented route files + Zod schemas
- SDK architecture: HIGH — sourced from ARCHITECTURE.md + CONTEXT.md locked decisions
- TypeScript generics pattern: HIGH — documented from UPLOADKIT-GSD.md §3.3 + CONTEXT.md D-07/D-08
- Test infrastructure: HIGH — sourced from existing `packages/shared/vitest.config.ts` pattern
- BYOS S3Client usage: HIGH — same `@aws-sdk` already used in `apps/api/src/lib/presign.ts`

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable domain — API contract is implemented, won't change)
