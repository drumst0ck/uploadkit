# Architecture Research

**Domain:** File Uploads as a Service (FUaaS) — SaaS platform with open-source SDK
**Researched:** 2026-04-07
**Confidence:** HIGH (confirmed via UploadThing docs, Turborepo docs, Cloudflare R2 docs, Better Auth monorepo pattern)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CONSUMER LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ Developer's  │  │ Developer's  │  │  UploadKit   │                   │
│  │  Browser     │  │  Next.js App │  │  Dashboard   │                   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                   │
├─────────┼────────────────┼────────────────────┼───────────────────────── │
│         │                │                    │    SDK LAYER             │
│  ┌──────▼───────┐  ┌──────▼───────┐           │                          │
│  │ @uploadkit/  │  │ @uploadkit/  │           │                          │
│  │   react      │  │    next      │           │                          │
│  └──────┬───────┘  └──────┬───────┘           │                          │
│         └────────┬─────────┘                  │                          │
│            ┌──────▼───────┐                   │                          │
│            │ @uploadkit/  │                   │                          │
│            │    core      │                   │                          │
│            └──────┬───────┘                   │                          │
├───────────────────┼───────────────────────────┼───────────────────────── │
│                   │                           │    API LAYER             │
│            ┌──────▼───────────────────────────▼───────┐                 │
│            │              REST API                     │                 │
│            │  /api/v1/upload  /api/v1/files            │                 │
│            │  /api/v1/projects  /api/v1/keys           │                 │
│            │  /api/v1/usage   /api/v1/billing          │                 │
│            └──────┬──────────────────────────┬─────────┘                 │
├───────────────────┼──────────────────────────┼───────────────────────── │
│                   │                          │     DATA / INFRA LAYER   │
│  ┌────────────────▼────┐  ┌─────────────────▼──┐  ┌─────────────────┐  │
│  │   MongoDB Atlas     │  │   Cloudflare R2     │  │  Upstash Redis  │  │
│  │  (metadata + users) │  │  (file storage)     │  │  (rate limits)  │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────┘  │
│  ┌─────────────────────┐  ┌─────────────────────┐                        │
│  │      Stripe         │  │      Resend          │                        │
│  │  (billing)          │  │  (transactional email│                        │
│  └─────────────────────┘  └─────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `@uploadkit/core` | Presigned URL request, multipart upload orchestration, progress tracking, retry logic, abort, client-side validation, BYOS handler interface | Framework-agnostic TypeScript, zero React/Next deps |
| `@uploadkit/react` | UploadButton, UploadDropzone, UploadModal, FileList, FilePreview, useUploadKit hook | React peer dep, calls core internally |
| `@uploadkit/next` | `createUploadKitHandler` factory, `fileRouter` definition pattern, App Router route handler adapter | Next.js peer dep, wraps core server utilities |
| `apps/api` | Auth validation, presigned URL generation, file metadata CRUD, API key management, usage accounting, billing webhooks | Next.js Route Handlers or standalone Node |
| `apps/dashboard` | Developer portal: projects, files, API keys, usage charts, billing, upload logs | Next.js App Router, Auth.js v5 |
| `apps/web` | Marketing/landing page, pricing | Next.js App Router, static generation |
| `apps/docs` | SDK and API reference, quickstart guides | Fumadocs + MDX, Next.js App Router |
| `packages/db` | Mongoose models, connection cache, typed query helpers | Shared across apps/api and apps/dashboard |
| `packages/shared` | Types, constants, error classes, validation schemas | Zero dependencies, consumed by SDK + apps |
| `packages/ui` | Design system components used only by dashboard and web (not exported in SDK) | Tailwind v4, Radix UI |
| `packages/config` | Shared ESLint, TypeScript, Tailwind configs | Dev-only, no runtime exports |

## Recommended Project Structure

```
uploadkit/
├── apps/
│   ├── api/                  # REST API (presigned URL issuer, metadata store)
│   │   ├── src/
│   │   │   ├── routes/       # /v1/upload, /v1/files, /v1/projects, /v1/keys
│   │   │   ├── middleware/   # API key auth, rate limiting, tier validation
│   │   │   ├── services/     # storage.ts, billing.ts, usage.ts
│   │   │   └── webhooks/     # stripe.ts, r2-events.ts
│   │   └── package.json
│   ├── dashboard/            # SaaS customer portal (Next.js App Router)
│   │   ├── app/
│   │   │   ├── (auth)/       # login, register routes
│   │   │   ├── (app)/        # protected dashboard routes
│   │   │   │   ├── projects/ # project CRUD
│   │   │   │   ├── files/    # file browser
│   │   │   │   ├── logs/     # upload logs (polling)
│   │   │   │   ├── usage/    # charts, quotas
│   │   │   │   └── billing/  # Stripe billing portal
│   │   │   └── api/          # Route handlers (auth, billing webhooks)
│   │   └── package.json
│   ├── web/                  # Landing page (Next.js, mostly static)
│   │   ├── app/
│   │   │   ├── page.tsx      # Hero, features, pricing preview
│   │   │   └── pricing/      # Full pricing page
│   │   └── package.json
│   └── docs/                 # Fumadocs site
│       ├── app/
│       ├── content/          # MDX docs files
│       │   ├── quickstart/
│       │   ├── sdk/          # core, react, next reference
│       │   ├── api/          # REST API reference
│       │   └── guides/       # recipes, BYOS, etc.
│       └── package.json
├── packages/
│   ├── core/                 # @uploadkit/core (zero framework deps)
│   │   ├── src/
│   │   │   ├── client.ts     # UploadKitClient, presign request, upload
│   │   │   ├── multipart.ts  # Chunking, concurrent part uploads
│   │   │   ├── validation.ts # Client-side file type/size checks
│   │   │   ├── retry.ts      # Exponential backoff logic
│   │   │   ├── byos.ts       # BYOS server-side handler base
│   │   │   └── types.ts      # Shared TypeScript types
│   │   └── package.json
│   ├── react/                # @uploadkit/react (React peer dep)
│   │   ├── src/
│   │   │   ├── components/   # UploadButton, UploadDropzone, etc.
│   │   │   ├── hooks/        # useUploadKit
│   │   │   └── index.ts
│   │   └── package.json
│   ├── next/                 # @uploadkit/next (Next.js peer dep)
│   │   ├── src/
│   │   │   ├── server.ts     # createUploadKitHandler, fileRouter
│   │   │   ├── client.ts     # generateComponents() for Next
│   │   │   └── index.ts
│   │   └── package.json
│   ├── db/                   # Mongoose models + connection cache
│   │   ├── src/
│   │   │   ├── models/       # User, Project, File, ApiKey, etc.
│   │   │   ├── connection.ts # Cached connection for serverless
│   │   │   └── index.ts
│   │   └── package.json
│   ├── shared/               # Types, constants, error classes
│   │   ├── src/
│   │   │   ├── errors.ts     # UploadKitError hierarchy
│   │   │   ├── constants.ts  # Tier limits, file size defaults
│   │   │   └── types.ts      # Shared cross-package types
│   │   └── package.json
│   ├── ui/                   # Internal design system (not SDK)
│   │   ├── src/
│   │   │   ├── components/   # Button, Card, Dialog, DataTable, etc.
│   │   │   └── index.ts
│   │   └── package.json
│   └── config/               # Shared dev configs
│       ├── eslint/
│       ├── typescript/
│       └── tailwind/
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### Structure Rationale

- **`apps/api` separate from `apps/dashboard`:** The API receives upload traffic from third-party developer apps — it should be independently deployable and scalable without coupling to dashboard auth concerns. The API is the hot path; the dashboard is low-traffic admin.
- **`packages/core` zero-dependency:** Keeps the SDK tree-shakeable and usable outside React/Next environments (Vue, Svelte, vanilla JS in future). React and Next wrappers take core as a regular (non-peer) dependency since they own the version.
- **`packages/db` shared between api and dashboard:** Both apps need the same Mongoose models. Centralizing prevents model drift. The cached connection pattern (`let cached = global.mongoose`) is required for serverless cold starts.
- **`packages/shared` for cross-boundary types:** The SDK publishes types that must match what the API returns. A single source of truth prevents divergence.
- **`packages/ui` internal only:** Dashboard UI components are not part of the public SDK. Separating prevents accidental bundling of Radix/Tailwind into `@uploadkit/react`.

## Architectural Patterns

### Pattern 1: Presigned URL Upload Flow (Two-Phase Upload)

**What:** The client never proxies file data through your server. Instead: (1) server issues a signed URL for direct storage upload, (2) client uploads to storage directly, (3) client reports completion, (4) server records metadata.

**When to use:** Always for uploads. No exceptions. Server-proxied uploads do not scale and cost bandwidth twice.

**Trade-offs:** Requires a second API call (confirm step); if client abandons after uploading to R2 but before confirming, orphaned files accumulate. Mitigate with a scheduled cleanup job checking File records with status `pending` older than 1 hour.

```typescript
// Phase 1: Client requests presigned URL from API
POST /api/v1/upload/presign
{
  projectId: "proj_abc",
  fileName: "photo.jpg",
  fileSize: 4200000,
  contentType: "image/jpeg"
}
// API validates: API key, tier quota, file type whitelist, size limit
// API generates presigned PUT URL (5 min expiry)
// API inserts File record with status: "pending"
// Returns: { fileId, presignedUrl, cdnUrl }

// Phase 2: Client uploads directly to R2
PUT https://bucket.account.r2.cloudflarestorage.com/projects/proj_abc/file_xyz.jpg
(raw binary, no auth headers — signed into URL)

// Phase 3: Client confirms upload complete
POST /api/v1/upload/complete
{ fileId: "file_xyz" }
// API verifies file exists in R2 (HEAD request)
// API updates File record: status "complete", updates UsageRecord
// Returns: { file: { id, name, url, size, ... } }
```

### Pattern 2: FileRouter Definition Pattern (SDK Server Side)

**What:** The developer defines typed upload endpoints in a single `fileRouter` object using a chainable builder. Each route specifies allowed types/sizes, runs middleware for auth, and handles post-upload callbacks. The `createUploadKitHandler` wraps this into a single Next.js route handler.

**When to use:** This is the entire server-side SDK interface. It mirrors UploadThing's proven pattern (see source: docs.uploadthing.com) because the DX is the product.

**Trade-offs:** The builder pattern requires careful TypeScript inference to flow middleware return types into the `onUploadComplete` callback — this is the hardest engineering problem in the SDK, but it pays off in type safety.

```typescript
// apps/my-next-app/app/api/uploadkit/[...uploadkit]/route.ts
import { createUploadKitHandler } from "@uploadkit/next";

const router = createUploadKitHandler({
  apiKey: process.env.UPLOADKIT_SECRET_KEY,
  routes: {
    avatar: uploadKit
      .fileTypes(["image/jpeg", "image/png", "image/webp"])
      .maxSize("2MB")
      .middleware(async ({ req }) => {
        const user = await auth(req);
        if (!user) throw new UploadKitError("UNAUTHORIZED");
        return { userId: user.id }; // flows into onUploadComplete
      })
      .onUploadComplete(async ({ metadata, file }) => {
        await db.user.update(metadata.userId, { avatar: file.url });
      }),
  },
});

export const { GET, POST } = router;
```

### Pattern 3: BYOS Server-Side Credential Isolation

**What:** BYOS mode uses the same `createUploadKitHandler` interface but routes presigned URL generation through the developer's own server using their own S3/R2 credentials. Credentials never reach the browser. The SDK detects BYOS mode via a `storage` configuration block.

**When to use:** When a developer provides their own S3/R2/GCS credentials instead of using the UploadKit managed bucket.

**Trade-offs:** Usage metering and file metadata storage still go through the UploadKit API (with the developer's API key), but the actual bytes never touch UploadKit infrastructure — this is the key selling point vs. UploadThing.

```typescript
// BYOS mode: same SDK interface, different backend
const router = createUploadKitHandler({
  apiKey: process.env.UPLOADKIT_SECRET_KEY,
  storage: {
    provider: "s3",
    region: "us-east-1",
    bucket: process.env.MY_S3_BUCKET,
    accessKeyId: process.env.MY_AWS_KEY,       // server-only, never in browser
    secretAccessKey: process.env.MY_AWS_SECRET, // server-only, never in browser
  },
  routes: { ... },
});
```

### Pattern 4: Turborepo Build Pipeline with Package Dependencies

**What:** Turborepo's `turbo.json` declares `"dependsOn": ["^build"]` which forces bottom-up builds: `packages/shared` → `packages/core` → `packages/react` + `packages/next` → `apps/*` in parallel.

**When to use:** Always. This is the only way to guarantee SDK packages are compiled before apps that import them.

**Trade-offs:** Cold builds are slower (no cache). After first build, task caching makes subsequent builds near-instant for unchanged packages.

```json
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "persistent": true,
      "cache": false
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

## Data Flow

### Upload Flow (Managed Storage)

```
Developer's Browser
    │
    │  1. User selects file
    ▼
@uploadkit/react (UploadDropzone)
    │
    │  2. Client-side validation (type, size)
    │  3. POST /api/[developer-app]/uploadkit
    ▼
@uploadkit/next (route handler)
    │
    │  4. Runs middleware (auth check)
    │  5. POST to UploadKit API /v1/upload/presign
    ▼
UploadKit API (apps/api)
    │
    │  6. Validate API key → look up Project
    │  7. Check tier quota (UsageRecord)
    │  8. Generate presigned PUT URL (R2, 5 min TTL)
    │  9. Insert File record (status: "pending")
    │  10. Return presignedUrl + fileId + cdnUrl
    ▼
@uploadkit/react (client)
    │
    │  11. PUT file bytes directly to R2 presigned URL
    │      (progress events → onUploadProgress callback)
    ▼
Cloudflare R2
    │
    │  12. File stored, 200 OK returned to client
    ▼
@uploadkit/next (client completes)
    │
    │  13. POST /v1/upload/complete { fileId }
    ▼
UploadKit API
    │
    │  14. HEAD request to R2 to verify file exists
    │  15. Update File status → "complete"
    │  16. Increment UsageRecord (storage bytes + upload count)
    │  17. Return file metadata to SDK
    ▼
@uploadkit/react
    │
    │  18. Call onUploadComplete with file metadata
    ▼
Developer's onUploadComplete callback
    │
    │  19. Developer app persists file URL to their DB
```

### Upload Flow (BYOS Mode)

Steps 1–5 are identical. At step 6, the UploadKit API recognizes BYOS project and instead calls the developer's registered handler URL to generate the presigned URL from their own storage credentials. Step 11 uploads to the developer's own R2/S3 bucket. Steps 13–17 still go through UploadKit API for usage accounting, but UploadKit never touches the file bytes.

### API Key Authentication Flow

```
Incoming request to /api/v1/*
    │
    ▼
Middleware: extract `Authorization: Bearer uk_live_xxx`
    │
    ▼
Upstash Redis: check rate limit (sliding window, per key)
    │  429 if exceeded
    ▼
MongoDB: find ApiKey by hash (never store raw key)
    │  401 if not found or inactive
    ▼
Load Project + Subscription tier
    │
    ▼
Route handler runs with { project, subscription, apiKey } context
```

### Multipart Upload Flow (files > 10MB)

```
@uploadkit/core (client)
    │
    │  POST /v1/upload/multipart/init
    ▼
UploadKit API
    │  Creates R2 multipart upload, returns uploadId + presigned URLs per part
    ▼
@uploadkit/core
    │  Uploads N parts concurrently (default: 3 at a time)
    │  Tracks ETag per part
    │
    │  POST /v1/upload/multipart/complete { uploadId, parts: [{partNumber, eTag}] }
    ▼
UploadKit API
    │  Sends CompleteMultipartUpload to R2
    │  Updates File record to "complete"
```

## Suggested Build Order

This is the order in which components must be built. Each phase unblocks the next.

### Phase 1: Foundation (no upstream dependencies)

1. `packages/config` — ESLint, TypeScript, Tailwind shared configs. Everything else depends on this.
2. `packages/shared` — Error types, tier constants, shared TypeScript interfaces. Zero runtime deps.

### Phase 2: Data Layer

3. `packages/db` — Mongoose models (User, Project, File, ApiKey, FileRouter, Subscription, UsageRecord), cached connection. Depends on `shared` types.

### Phase 3: Core SDK

4. `packages/core` — Upload client, multipart orchestration, retry, BYOS interface. Depends on `shared` only. This is the hardest package to build correctly (presigned URL flow, multipart, retry logic, abort signals, progress events).

### Phase 4: API Backend

5. `apps/api` — REST API with presigned URL generation, file CRUD, API key management, usage accounting, rate limiting. Depends on `db` + `shared`. This must be deployed (or at least running locally) before any SDK can be tested end-to-end.

### Phase 5: Framework SDK Packages

6. `packages/react` — Components and hook. Depends on `core` (regular dep, pinned). React is a peer dep.
7. `packages/next` — Server handler + client component generator. Depends on `core`. Next.js is a peer dep.

These can be built in parallel after Phase 4 is functional.

### Phase 6: Applications

8. `apps/dashboard` — Auth, project management, file browser, billing. Depends on `db`, `shared`, `ui`. Stripe integration here.
9. `apps/web` — Landing page, pricing. Depends on `ui`, `shared`.
10. `apps/docs` — Fumadocs. Depends on none except build-time MDX. Built last because it documents what was built.

### Phase 7: Release Infrastructure

11. Changesets + GitHub Actions CI/CD for SDK publishing. Only meaningful after the SDK packages are stable.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Cloudflare R2 | `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (S3-compatible) | CORS must be configured on bucket for browser PUTs; presigned URLs embed Content-Type to prevent type spoofing |
| MongoDB Atlas | Mongoose with cached connection (`global.mongoose` pattern) | Critical for serverless — without caching, cold starts open new connections per invocation; Atlas free tier has 500-connection limit |
| Upstash Redis | `@upstash/ratelimit` sliding window per API key | Deploy via Upstash console; use REST client not tcp client (serverless-compatible) |
| Stripe | Webhooks for subscription lifecycle; Checkout for upgrades; Billing Portal for self-service | Webhook endpoint requires raw body (`request.clone()` in Next.js); test with Stripe CLI in dev |
| Resend | `resend` npm package, transactional only | Welcome email, usage threshold alerts (80%/100%), invoice generated |
| Auth.js v5 | GitHub + Google OAuth + email magic link | Dashboard only — API uses API keys not sessions; JWT strategy for serverless |
| Sentry | `@sentry/nextjs` on dashboard and api | Source maps uploaded in CI; instrument API route handlers with `withSentry` |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `@uploadkit/react` ↔ `@uploadkit/core` | Direct TypeScript import | core is a direct dep (not peer) of react package |
| `@uploadkit/next` ↔ `@uploadkit/core` | Direct TypeScript import | core is a direct dep (not peer) of next package |
| `apps/api` ↔ `packages/db` | Direct import (workspace:*) | Both run in same Node.js runtime; no network boundary |
| `apps/dashboard` ↔ `packages/db` | Direct import (workspace:*) | Dashboard uses db for Auth.js session storage |
| SDK (developer's app) ↔ `apps/api` | HTTP REST (Authorization: Bearer uk_live_xxx) | Network boundary; must handle timeouts, retry on 5xx |
| `apps/dashboard` ↔ `apps/api` | HTTP REST using internal API key | Dashboard calls API for file listings, usage data |
| `apps/api` ↔ Cloudflare R2 | AWS SDK v3 S3 client | R2 endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k projects | Single Vercel deployment for all apps; MongoDB Atlas M0 free tier; Upstash free tier; R2 scales automatically |
| 1k–50k projects | API app separate Vercel project for independent scaling; MongoDB Atlas M10 dedicated; add CDN custom domain (cdn.uploadkit.dev); consider Cloudflare Workers for presign endpoint (edge latency) |
| 50k+ projects | Presign endpoint moves to Cloudflare Workers (zero cold start); separate read/write MongoDB; consider R2 object lifecycle policies for cleanup; metered billing becomes non-trivial (batch UsageRecord writes) |

### Scaling Priorities

1. **First bottleneck:** MongoDB connection exhaustion in serverless. Fix: enforce cached connection pattern; upgrade Atlas tier before hitting 500-connection limit.
2. **Second bottleneck:** Presigned URL generation latency (cold starts). Fix: move presign endpoint to Cloudflare Workers which have no cold start.
3. **Third bottleneck:** UsageRecord writes on every upload. Fix: batch usage increments with Redis atomic counters, flush to MongoDB periodically.

## Anti-Patterns

### Anti-Pattern 1: Server-Proxied File Uploads

**What people do:** Route file bytes through the Next.js API route handler (`req.body` → S3 PUT).
**Why it's wrong:** Doubles bandwidth costs; ties up serverless function for entire upload duration; Vercel has a 4.5MB body size limit on serverless functions; does not scale.
**Do this instead:** Always use presigned URL flow. Client PUT directly to R2.

### Anti-Pattern 2: Exposing S3 Credentials to the Browser

**What people do:** Send `accessKeyId`/`secretAccessKey` in an API response or embed in client bundle for BYOS.
**Why it's wrong:** Exposes full bucket write/delete access. Any user can exfiltrate or destroy all stored files.
**Do this instead:** All presigned URL generation happens server-side. BYOS credentials live only in server environment variables and are never serialized into API responses.

### Anti-Pattern 3: Monolithic SDK Package

**What people do:** Ship `uploadkit` as one package with React, Next.js, and Vue code bundled together.
**Why it's wrong:** Bloats bundle size; makes tree-shaking impossible; forces React as a hard dependency even in non-React contexts; version coupling between framework and core makes updates painful.
**Do this instead:** `@uploadkit/core` (framework-agnostic) → `@uploadkit/react` → `@uploadkit/next`. Users install only what they need.

### Anti-Pattern 4: Skipping the File Status Lifecycle

**What people do:** Mark the file as complete immediately when issuing the presigned URL.
**Why it's wrong:** Client may fail mid-upload or abandon — now you have zombie File records with no actual data in R2, polluting the file browser and skewing storage usage counts.
**Do this instead:** File status: `pending` (on presign) → `complete` (on confirmed upload) → `deleted` (soft delete). Run a cleanup job that removes `pending` records older than 1 hour.

### Anti-Pattern 5: One MongoDB Connection Per Serverless Invocation

**What people do:** Call `mongoose.connect()` at the top of each route handler without caching.
**Why it's wrong:** Each cold start opens a new TCP connection. Under moderate load (100 concurrent invocations) this exhausts the Atlas free-tier connection pool, causing `MongoServerError: too many connections`.
**Do this instead:** Cache the connection in a module-level variable that survives across invocations in the same Lambda container:
```typescript
// packages/db/src/connection.ts
let cached = (global as any).mongoose;
if (!cached) cached = (global as any).mongoose = { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) cached.promise = mongoose.connect(process.env.MONGODB_URI!);
  cached.conn = await cached.promise;
  return cached.conn;
}
```

## Sources

- Turborepo Package and Task Graph: https://turborepo.dev/docs/core-concepts/package-and-task-graph
- Cloudflare R2 Presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- UploadThing File Routes pattern: https://docs.uploadthing.com/file-routes
- Better Auth monorepo package structure: https://deepwiki.com/better-auth/better-auth/1.1-package-structure-and-monorepo
- Fumadocs Next.js integration: https://deepwiki.com/fuma-nama/fumadocs/7.1-build-system-and-monorepo-management
- Upstash Rate Limiting: https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
- pnpm + Changesets monorepo guide: https://jsdev.space/complete-monorepo-guide/
- High-scale file upload designs (S3/R2/signed URLs): https://medium.com/@ThinkingLoop/9-high-scale-file-upload-designs-with-s3-r2-and-signed-urls-ad1425ee85e8
- Efficient S3 upload pipeline with event triggers: https://brightinventions.pl/blog/efficient-S3-file-uploads-with-async-processing/

---
*Architecture research for: File Uploads as a Service (FUaaS) — UploadKit*
*Researched: 2026-04-07*
