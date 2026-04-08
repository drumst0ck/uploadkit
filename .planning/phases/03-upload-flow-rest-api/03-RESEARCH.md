# Phase 3: Upload Flow & REST API — Research

**Researched:** 2026-04-08
**Domain:** Presigned URL upload pipeline, multipart S3/R2 uploads, Next.js App Router API routes, Upstash QStash webhooks, API key authentication middleware, Zod validation, Upstash rate limiting
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use Next.js App Router API routes (not Hono). All routes in `apps/api/src/app/api/v1/`. Already scaffolded.
- **D-02:** API key auth via `withApiKey(handler)` wrapper function — validates key, attaches project to context, returns 401 on failure. Every `/api/v1/*` route wraps with this.
- **D-03:** Next.js file-based routing — one file per endpoint: `apps/api/src/app/api/v1/upload/request/route.ts`, etc.
- **D-04:** Multipart threshold: 10MB. Chunk size: 5MB (R2 minimum part size). Files ≤10MB use single PUT, >10MB use multipart.
- **D-05:** Confirm step (complete-upload) performs: (1) HEAD object in R2 to verify file exists, (2) store file metadata in MongoDB, (3) fire onUploadComplete webhook via QStash, (4) update usage records.
- **D-06:** Orphaned upload cleanup: cron job that queries File records with status=UPLOADING older than 1 hour, deletes from R2 + removes DB record. No R2 lifecycle rule — cron is the single cleanup mechanism.
- **D-07:** Stripe-style error format: `{ error: { type, code, message, suggestion } }`. HTTP status: 400/401/403/404/429/500.
- **D-08:** Request validation with Zod schemas. `schema.safeParse()` with field-level Stripe-style errors on failure.
- **D-09:** onUploadComplete fires asynchronously via Upstash QStash. Confirm endpoint enqueues and returns immediately.
- **D-10:** Retry policy: 3 retries with exponential backoff (QStash built-in). After 3 failures, mark webhook as failed in upload log. Upload remains complete regardless.

### Claude's Discretion

- Zod schema design per endpoint (field names, validation rules)
- `withApiKey` implementation details (header extraction, key lookup, caching)
- Rate limiting wiring pattern (which limits on which endpoints)
- Multipart upload API design (initiate, upload-part, complete-multipart endpoints)
- Cron job implementation (Vercel Cron vs standalone script vs API route with auth)
- QStash integration specifics (signing, verification, URL configuration)
- Pagination strategy for list endpoints (cursor vs offset)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UPLD-01 | Client can request presigned PUT URL via POST /api/v1/upload/request (validates API key, tier limits, file type/size) | `withApiKey` wrapper + Zod validation + tier limit check against `TIER_LIMITS` + `generatePresignedPutUrl` already built |
| UPLD-02 | Client uploads directly to R2 via presigned URL (no server proxy) | Presign utility locks Content-Type + Content-Length; R2 CORS already configured in Phase 1 |
| UPLD-03 | Client confirms upload via POST /api/v1/upload/complete (API verifies file in R2, stores metadata, executes onUploadComplete callback) | HeadObject command for R2 verification; File model for metadata; QStash for async callback |
| UPLD-04 | Multipart upload for files >10MB (transparent chunking, 5MB min part size, ETag collection) | CreateMultipartUpload / UploadPart / CompleteMultipartUpload via AWS SDK v3; ETag captured from response headers |
| UPLD-05 | Upload progress events (0-100%) via XHR | Server side: presigned URL provides direct R2 URL; client uses XHR `onprogress` event (Phase 4 SDK concern — server must return presigned URL correctly) |
| UPLD-06 | Upload abort/cancel via AbortController | Server side: AbortMultipartUpload endpoint needed for multipart; single-part: client-side only |
| UPLD-07 | Automatic retry with exponential backoff (configurable, default 3 retries) | SDK concern (Phase 4); server must return retryable 5xx vs non-retryable 4xx correctly |
| UPLD-08 | Client-side file type and size validation before upload request | Server enforces the same rules — FileRouter config + TIER_LIMITS provide the ground truth returned on upload/request |
| UPLD-09 | Cleanup job for stale "UPLOADING" records (>1 hour) | Cron route at `/api/cron/cleanup` with CRON_SECRET; query File.find({status:'UPLOADING', createdAt:{$lt:1h ago}}); DeleteObject + remove record |
| API-01 | API key authentication on all v1 endpoints (Node.js runtime, not Edge) | `withApiKey` wrapper in route handler — NOT in middleware.ts (Edge incompatibility with Mongoose) |
| API-02 | Files CRUD (list paginated, get by key, update metadata, delete) | File model; cursor-based pagination; soft delete with `deletedAt`; DeleteObject for R2 |
| API-03 | Projects CRUD (list, create, edit, delete) | Project model; slug generation with nanoid; userId scoping from withApiKey context |
| API-04 | API Keys management (list per project, create with uk_live_/uk_test_ prefix, revoke) | ApiKey model; `API_KEY_PREFIX` constants; nanoid for key body; store key as-is (or hash) |
| API-05 | File Router configuration endpoints (CRUD per project) | FileRouter model; `{projectId, slug}` unique index already set |
| API-06 | Usage endpoints (current period, history) | UsageRecord model; period format YYYY-MM; aggregate or direct lookup |
| API-07 | Upload logs endpoint (GET /api/v1/logs?since=timestamp) | Query File model by projectId + createdAt>since; dashboard polls every 5s |
| API-08 | Descriptive error messages with codes and fix suggestions (Stripe-style) | `UploadKitError` hierarchy in packages/shared covers this; map to `{ error: { type, code, message, suggestion } }` |

</phase_requirements>

---

## Summary

Phase 3 is the core backend of UploadKit. It connects the already-built infrastructure (R2 client, presign utility, rate limiters, all Mongoose models) into working API route handlers. The phase has no new third-party libraries to introduce except `@upstash/qstash` (for async webhook delivery) and `nanoid`/`bcryptjs` (already in the shared package.json or trivially added). Everything architectural was resolved in Phase 1: the presign utility locks Content-Type + Content-Length, the rate limiters are configured, and all DB models are present.

The primary engineering complexity is in four areas: (1) the `withApiKey` middleware wrapper that must run in Node.js runtime (not Edge) and cache API key lookups; (2) the multipart upload pipeline with correct ETag collection and abort handling; (3) the QStash webhook delivery pattern where the confirm endpoint must enqueue and return immediately; and (4) the usage counter updates using atomic `$inc` to prevent race conditions under concurrent uploads.

A critical gap was found during code inspection: the `ApiKey` model stores the key as plain text (no hashing column), and the `UsageRecord` model tracks by `userId` but there is no `projectId` field on it — usage lookups in API context will need to go through Project.userId. Additionally, the `apps/api/package.json` does not yet declare `@uploadkit/db` or `@uploadkit/shared` as workspace dependencies — these must be added before writing any route code.

**Primary recommendation:** Start with the `withApiKey` wrapper and error serializer helper, then build the upload request/complete endpoints, then CRUD endpoints, then cron job. QStash integration is the only net-new integration requiring setup.

---

## Standard Stack

### Core (all already installed or in monorepo)

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| `@aws-sdk/client-s3` | 3.1026.0 | CreateMultipartUpload, UploadPart, CompleteMultipartUpload, HeadObject, DeleteObject | [VERIFIED: npm registry] |
| `@aws-sdk/s3-request-presigner` | 3.1026.0 | getSignedUrl for presigned PUT part URLs in multipart | [VERIFIED: npm registry] |
| `@upstash/ratelimit` | latest (2.x) | Rate limiting — instances already built in `lib/rate-limit.ts` | [VERIFIED: codebase] |
| `@upstash/redis` | latest | Redis client for rate limiter | [VERIFIED: codebase] |
| `zod` | 4.3.6 | Per-endpoint request validation schemas | [VERIFIED: npm registry] |
| `@uploadkit/db` | workspace:* | connectDB, all Mongoose models | [VERIFIED: codebase — needs to be added to api/package.json] |
| `@uploadkit/shared` | workspace:* | TIER_LIMITS, FILE_STATUSES, API_KEY_PREFIX, UploadKitError hierarchy | [VERIFIED: codebase — needs to be added to api/package.json] |

### Net-New for Phase 3

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| `@upstash/qstash` | 2.10.1 | Async webhook delivery with 3-retry exponential backoff | [VERIFIED: npm registry] |
| `nanoid` | 5.1.7 | Generate file key UUIDs and API key bodies | [VERIFIED: npm registry] |
| `bcryptjs` | 3.0.3 | Hash API keys at creation time before storing | [VERIFIED: npm registry] |

**Note on `bcryptjs`:** The current `ApiKey` model stores the key as plain text (`key: { type: String, required: true, unique: true }`). [ASSUMED] The plan should either (a) store a hash and return the full key only at creation, or (b) accept plain-text storage for MVP. Decision left to planner — document the gap.

**Installation:**
```bash
# In apps/api
pnpm add @upstash/qstash nanoid bcryptjs
pnpm add -D @types/bcryptjs

# Add workspace deps to apps/api/package.json
# "@uploadkit/db": "workspace:*"
# "@uploadkit/shared": "workspace:*"
```

**Version verification:** Confirmed against npm registry on 2026-04-08.

---

## Architecture Patterns

### Recommended Route File Structure

```
apps/api/src/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── upload/
│   │       │   ├── request/route.ts         # POST — presigned URL generation
│   │       │   ├── complete/route.ts        # POST — confirm upload, store metadata
│   │       │   ├── multipart/
│   │       │   │   ├── init/route.ts        # POST — CreateMultipartUpload
│   │       │   │   ├── part/route.ts        # POST — presigned URL per part
│   │       │   │   ├── complete/route.ts    # POST — CompleteMultipartUpload
│   │       │   │   └── abort/route.ts       # POST — AbortMultipartUpload
│   │       ├── files/
│   │       │   ├── route.ts                 # GET (list), — (no POST, files created via upload flow)
│   │       │   └── [key]/route.ts           # GET, PATCH, DELETE
│   │       ├── projects/
│   │       │   ├── route.ts                 # GET, POST
│   │       │   └── [id]/
│   │       │       ├── route.ts             # PATCH, DELETE
│   │       │       ├── keys/route.ts        # GET, POST
│   │       │       └── routers/route.ts     # GET, POST
│   │       ├── keys/
│   │       │   └── [keyId]/route.ts         # DELETE (revoke)
│   │       ├── routers/
│   │       │   └── [routerId]/route.ts      # PATCH, DELETE
│   │       ├── usage/
│   │       │   ├── route.ts                 # GET (current period)
│   │       │   └── history/route.ts         # GET (past periods)
│   │       └── logs/route.ts                # GET ?since=timestamp
│   └── api/
│       └── cron/
│           └── cleanup/route.ts             # GET — orphaned upload cleanup (CRON_SECRET protected)
└── lib/
    ├── storage.ts         # EXISTING — r2Client, R2_BUCKET, CDN_URL
    ├── presign.ts         # EXISTING — generatePresignedPutUrl
    ├── rate-limit.ts      # EXISTING — ratelimit, uploadRatelimit
    ├── sentry.ts          # EXISTING — initSentry
    ├── with-api-key.ts    # NEW — withApiKey(handler) wrapper
    ├── errors.ts          # NEW — serializeError(err) → Stripe-style response
    └── qstash.ts          # NEW — QStash client + enqueueWebhook(url, payload)
```

### Pattern 1: `withApiKey` Wrapper

**What:** Higher-order function that wraps every `/api/v1/*` route handler. Extracts `Authorization: Bearer uk_live_xxx`, validates against MongoDB, attaches `{ project, apiKey, tier }` to a context object, then calls the inner handler.

**When to use:** Every route handler in `/api/v1/`. No exceptions.

**Key implementation details:**
- Must run in Node.js runtime (not Edge) — Mongoose requires TCP sockets
- Add `export const runtime = 'nodejs'` at the top of every route file
- Rate limit check happens inside `withApiKey`, keyed by `apiKey._id.toString()` (not IP)
- API key lookup: find by `key` field in MongoDB; check `revokedAt` is null
- Update `lastUsedAt` with `$set` after validation (fire-and-forget, don't await)

```typescript
// Source: packages/shared/src/errors.ts + D-02 decision
import { connectDB, ApiKey, Project, Subscription } from '@uploadkit/db';
import { UnauthorizedError, RateLimitError } from '@uploadkit/shared';
import { ratelimit } from './rate-limit';
import { NextRequest, NextResponse } from 'next/server';

export interface ApiContext {
  apiKey: IApiKey;
  project: IProject;
  tier: Tier;
}

type Handler = (req: NextRequest, ctx: ApiContext, params?: unknown) => Promise<NextResponse>;

export function withApiKey(handler: Handler, useUploadLimit = false) {
  return async (req: NextRequest, segmentData?: { params?: unknown }) => {
    await connectDB();
    
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return serializeError(new UnauthorizedError());

    // Rate limit first (Upstash HTTP — no DB needed)
    const limiter = useUploadLimit ? uploadRatelimit : ratelimit;
    const { success, reset } = await limiter.limit(`apikey:${token.slice(0, 20)}`);
    if (!success) return serializeError(new RateLimitError(Math.ceil((reset - Date.now()) / 1000)));

    // DB lookup
    const apiKeyDoc = await ApiKey.findOne({ key: token, revokedAt: null }).populate('projectId');
    if (!apiKeyDoc) return serializeError(new UnauthorizedError());

    // Fire-and-forget lastUsedAt update
    void ApiKey.updateOne({ _id: apiKeyDoc._id }, { $set: { lastUsedAt: new Date() } });

    // Load subscription tier
    const subscription = await Subscription.findOne({ userId: (apiKeyDoc.projectId as IProject).userId });
    const tier = subscription?.tier ?? 'FREE';

    return handler(req, { apiKey: apiKeyDoc, project: apiKeyDoc.projectId as IProject, tier }, segmentData?.params);
  };
}
```

### Pattern 2: Stripe-Style Error Serializer

**What:** Maps `UploadKitError` (and unknown errors) to the D-07 JSON format.

```typescript
// apps/api/src/lib/errors.ts
import { UploadKitError } from '@uploadkit/shared';
import { NextResponse } from 'next/server';

const ERROR_TYPE_MAP: Record<number, string> = {
  400: 'invalid_request',
  401: 'authentication_error',
  403: 'invalid_request',  // tier limit
  404: 'invalid_request',
  429: 'rate_limit_error',
  500: 'api_error',
};

export function serializeError(err: unknown): NextResponse {
  if (err instanceof UploadKitError) {
    return NextResponse.json(
      {
        error: {
          type: ERROR_TYPE_MAP[err.statusCode] ?? 'api_error',
          code: err.code,
          message: err.message,
          ...(err.suggestion ? { suggestion: err.suggestion } : {}),
        },
      },
      { status: err.statusCode },
    );
  }
  console.error('Unhandled error:', err);
  return NextResponse.json(
    { error: { type: 'api_error', code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
    { status: 500 },
  );
}
```

### Pattern 3: Upload Request Endpoint

**What:** POST `/api/v1/upload/request` — validates file, generates presigned URL, inserts File record.

**Zod schema:**
```typescript
const UploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive(),
  contentType: z.string().min(1),
  routeSlug: z.string().min(1),    // FileRouter slug
  metadata: z.record(z.unknown()).optional(),
});
```

**Key steps (in order):**
1. `withApiKey` validates key, attaches project + tier
2. Zod validates request body
3. Look up `FileRouter` by `{ projectId, slug: routeSlug }` — 404 if not found
4. Validate `fileSize <= Math.min(fileRouter.maxFileSize, TIER_LIMITS[tier].maxFileSizeBytes)` → 403 TierLimitError
5. Validate `contentType` is in `fileRouter.allowedTypes` → 400
6. Check `storageUsed + fileSize <= TIER_LIMITS[tier].maxStorageBytes` via UsageRecord → 403
7. Check `uploads < TIER_LIMITS[tier].maxUploadsPerMonth` via UsageRecord → 403
8. Generate R2 key: `{projectId}/{routeSlug}/{nanoid()}/{fileName}`
9. Call `generatePresignedPutUrl({ key, contentType, contentLength: fileSize, expiresIn: 900 })`
10. Insert `File` with `status: 'UPLOADING'`
11. Return `{ fileId, uploadUrl, key, cdnUrl }`

**CDN URL formula:** `${CDN_URL}/${key}` — assembled server-side, not a presigned URL.

### Pattern 4: Upload Complete Endpoint

**What:** POST `/api/v1/upload/complete` — verifies R2, stores metadata, enqueues webhook.

**Zod schema:**
```typescript
const UploadCompleteSchema = z.object({
  fileId: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});
```

**Key steps:**
1. `withApiKey` wrapper
2. Zod validates body
3. Look up `File` by `_id: fileId` scoped to `projectId` — 404 if not found
4. HEAD request to R2: `new HeadObjectCommand({ Bucket: R2_BUCKET, Key: file.key })` — if throws `NotFound`, return 422 "File not found in storage"
5. `File.findByIdAndUpdate(fileId, { $set: { status: 'UPLOADED', metadata } })`
6. Atomic usage increment: `UsageRecord.findOneAndUpdate({ userId, period }, { $inc: { storageUsed: file.size, uploads: 1 } }, { upsert: true })`
7. Enqueue QStash webhook (fire-and-forget): `await enqueueWebhook(project.webhookUrl, { file, metadata })` — see QStash pattern below
8. Return `{ file: { _id, key, name, size, type, url, status, metadata, createdAt } }`

**Period format:** `new Date().toISOString().slice(0, 7)` → `"2026-04"`

### Pattern 5: Multipart Upload Flow (UPLD-04)

**What:** Three endpoints: init, get-part-url, complete. Abort endpoint for cancellation (UPLD-06).

**AWS SDK v3 commands used:**
```typescript
// Init: create upload session
import { CreateMultipartUploadCommand } from '@aws-sdk/client-s3';
const { UploadId } = await r2Client.send(new CreateMultipartUploadCommand({
  Bucket: R2_BUCKET,
  Key: fileKey,
  ContentType: contentType,
}));

// Per-part presigned URL (each part is a presigned PUT)
import { UploadPartCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const partUrl = await getSignedUrl(r2Client, new UploadPartCommand({
  Bucket: R2_BUCKET,
  Key: fileKey,
  UploadId,
  PartNumber: partNumber,  // 1-indexed, max 10000
}), { expiresIn: 900 });

// Complete: client sends [{ PartNumber, ETag }] collected from UploadPart response headers
import { CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';
await r2Client.send(new CompleteMultipartUploadCommand({
  Bucket: R2_BUCKET,
  Key: fileKey,
  UploadId,
  MultipartUpload: { Parts: parts },  // parts: Array<{ PartNumber: number; ETag: string }>
}));

// Abort
import { AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
await r2Client.send(new AbortMultipartUploadCommand({
  Bucket: R2_BUCKET, Key: fileKey, UploadId,
}));
```

**Critical constraint:** Part size minimum is `5 * 1024 * 1024` bytes (5 MiB) for all parts except the last. Hardcode as constant. [VERIFIED: PITFALLS.md — sourced from official R2 docs]

**ETag capture:** ETags come from each `UploadPart` HTTP response header — they are NOT computable client-side. The `complete-multipart` endpoint receives the ETag array from the client and passes it directly to `CompleteMultipartUploadCommand`. [VERIFIED: PITFALLS.md]

**Suggested multipart API design (Claude's discretion):**
```
POST /api/v1/upload/multipart/init
  body: { fileName, fileSize, contentType, routeSlug, partCount }
  returns: { uploadId, fileId, key, parts: [{ partNumber, uploadUrl }] }

POST /api/v1/upload/multipart/complete
  body: { fileId, uploadId, parts: [{ partNumber, etag }] }
  returns: { file }

POST /api/v1/upload/multipart/abort
  body: { fileId, uploadId }
  returns: { ok: true }
```

Generating all part URLs up-front (in `init`) simplifies the SDK: one request → all URLs → upload concurrently → complete. This matches how Cloudflare's own R2 multipart examples structure the flow. [ASSUMED]

### Pattern 6: QStash Webhook Integration (D-09, D-10)

**What:** After upload complete, enqueue an HTTP POST to the developer's registered `webhookUrl` with file metadata. Returns immediately — does not wait for delivery.

**QStash client setup:**
```typescript
// apps/api/src/lib/qstash.ts
import { Client } from '@upstash/qstash';

const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN!,
});

export async function enqueueWebhook(
  url: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await qstashClient.publishJSON({
    url,
    body: payload,
    retries: 3,           // D-10: 3 retries with exponential backoff (QStash default)
    headers: {
      'x-uploadkit-signature': computeHmac(process.env.WEBHOOK_SECRET!, payload), // [ASSUMED] HMAC for security
    },
  });
}
```

**Dev environment:** QStash requires a publicly accessible URL. In local dev, use `QSTASH_URL=http://localhost:8080` with the QStash dev server, OR skip QStash in dev by checking `process.env.NODE_ENV !== 'production'`. [CITED: upstash.com/docs/qstash]

**Where to store webhookUrl:** The `FileRouter` model currently has no `webhookUrl` field. The plan must add it, OR use a project-level webhook URL on the `Project` model. [ASSUMED — gap identified, planner to decide which model owns it]

**After 3 failures (D-10):** QStash does not call back on exhausted retries automatically. To mark webhook as failed, the API must expose a QStash callback URL (`/api/v1/webhooks/qstash-dlq`) that QStash POSTs to on final failure, which then updates the File/log record. [CITED: upstash.com/docs/qstash/features/callbacks]

### Pattern 7: Orphaned Upload Cleanup Cron (UPLD-09)

**What:** API route at `/api/cron/cleanup` protected by `CRON_SECRET` header. Queries stale UPLOADING records, deletes from R2, removes DB records.

```typescript
// apps/api/src/app/api/cron/cleanup/route.ts
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await connectDB();
  const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
  const stale = await File.find({ status: 'UPLOADING', createdAt: { $lt: cutoff } });
  
  await Promise.allSettled(stale.map(async (file) => {
    await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: file.key }));
    await File.deleteOne({ _id: file._id });
  }));
  
  return NextResponse.json({ cleaned: stale.length });
}
```

**Vercel Cron config** (in `vercel.json`):
```json
{
  "crons": [{ "path": "/api/cron/cleanup", "schedule": "0 * * * *" }]
}
```
[ASSUMED: Vercel Cron is the correct mechanism — the project deploys to Vercel. Verify `vercel.json` does not already exist.]

### Pattern 8: Cursor-Based Pagination (Claude's Discretion)

**What:** List endpoints use cursor-based pagination over MongoDB `_id` (ObjectId). More efficient than offset-based for large collections and compatible with the Pitfalls recommendation.

```typescript
// GET /api/v1/files?limit=50&cursor=<lastObjectId>
const query = cursor 
  ? { projectId, _id: { $lt: new Types.ObjectId(cursor) }, deletedAt: null }
  : { projectId, deletedAt: null };
const files = await File.find(query).sort({ _id: -1 }).limit(limit + 1);
const hasMore = files.length > limit;
const nextCursor = hasMore ? files[limit - 1]._id.toString() : null;
return { files: files.slice(0, limit), nextCursor };
```

### Anti-Patterns to Avoid

- **API key auth in `middleware.ts`:** Auth.js middleware runs on Edge runtime; Mongoose fails in Edge. Auth for `/api/v1/*` must live entirely in the route handler wrapper. [VERIFIED: PITFALLS.md #11]
- **Non-atomic usage updates:** `record.storageUsed += size; record.save()` causes race conditions under concurrent uploads. Always use `$inc`. [VERIFIED: PITFALLS.md #8]
- **Presigned URL to custom CDN domain:** `cdn.uploadkit.dev` cannot be used as the PUT target — R2 only signs requests to `*.r2.cloudflarestorage.com`. CDN URL is only for serving. [VERIFIED: PITFALLS.md #3]
- **Waiting for webhook in confirm response:** QStash `publishJSON` should be called but the response returned immediately after. Never await the webhook delivery itself. [VERIFIED: D-09]
- **Using `any` in route handlers:** TypeScript strict + zero `any` is a project constraint. Use `NextRequest`/`NextResponse` types throughout.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async webhook delivery with retry | Custom retry queue | `@upstash/qstash` | Built-in exponential backoff, DLQ, delivery guarantees, HTTP-native |
| Rate limiting | Redis INCR counter | `@upstash/ratelimit` sliding window | Already instantiated in `lib/rate-limit.ts`; handles distributed serverless correctly |
| Presigned URL generation | Manual HMAC signing | `@aws-sdk/s3-request-presigner` getSignedUrl | AWS SDK handles SigV4 correctly; already in `lib/presign.ts` |
| Unique file key generation | `Math.random()` | `nanoid()` | URL-safe, crypto-random, 21 chars = 2.8 × 10^30 combinations |
| Request body validation | Manual field checks | Zod `safeParse()` | Type inference + field-level error messages + coercion |
| Multipart ETag computation | MD5 of file bytes | Capture from `UploadPart` response headers | R2 multipart ETags are hash of concatenated binary MD5s — not computable from file bytes |

---

## Critical Code Gaps Found

### Gap 1: `@uploadkit/db` and `@uploadkit/shared` not in `apps/api/package.json`

**Finding:** `apps/api/package.json` has no `@uploadkit/db` or `@uploadkit/shared` dependency. Route handlers cannot import Mongoose models or shared error classes without these. [VERIFIED: codebase inspection]

**Fix:** Add to `apps/api/package.json`:
```json
"@uploadkit/db": "workspace:*",
"@uploadkit/shared": "workspace:*"
```
Also add `@uploadkit/db` to `transpilePackages` in `apps/api/next.config.ts` (currently only `@uploadkit/ui` is listed).

### Gap 2: `ApiKey` model stores key as plain text

**Finding:** `key: { type: String, required: true, unique: true }` with no hash column. Looking up by raw key value works but is a security risk if the DB is compromised. [VERIFIED: codebase inspection]

**Recommendation (Claude's discretion):** For v1 MVP, store a `sha256` hash: on creation, return full key once; on lookup, hash the incoming `Bearer` token and query by hash. This requires a model migration (add `keyHash` field) but does not require `bcryptjs` (bcrypt is too slow for per-request lookups — SHA256 is fine for high-entropy tokens like API keys). [ASSUMED — architectural decision for planner]

### Gap 3: No `webhookUrl` field on FileRouter or Project

**Finding:** Neither `FileRouter` nor `Project` model has a `webhookUrl` field. The confirm-upload endpoint (D-05) needs to fire `onUploadComplete` — but where is the developer's callback URL registered? [VERIFIED: codebase inspection]

**Recommendation:** Add `webhookUrl: { type: String }` to `FileRouter` (per-route callbacks, like UploadThing). This is more granular and matches the SDK pattern where different routes have different handlers. [ASSUMED]

### Gap 4: `UsageRecord` scoped by `userId`, not `projectId`

**Finding:** `UsageRecord` has `userId` field, not `projectId`. The `withApiKey` context provides `project` (and `project.userId`). Usage lookups during upload require an extra `Project.userId` lookup or passing the userId through. [VERIFIED: codebase inspection]

**Impact:** Low — `project.userId` is available in `withApiKey` context since `Project` is loaded during auth. The `$inc` pattern still works: `UsageRecord.findOneAndUpdate({ userId: project.userId, period }, ...)`.

---

## Common Pitfalls

### Pitfall 1: `runtime = 'nodejs'` Missing on Route Files

**What goes wrong:** Next.js default runtime for route handlers in App Router is configurable — without explicit declaration, some routes may run on Edge runtime in Vercel's production. Mongoose fails silently.

**How to avoid:** Add `export const runtime = 'nodejs';` at the top of every file in `apps/api/src/app/api/v1/`. This is a project-wide rule (REQUIREMENTS: API-01 "Node.js runtime, not Edge").

**Warning signs:** `Error: The edge runtime does not support Node.js 'net' module` in Vercel logs.

### Pitfall 2: Zod v4 Breaking Changes

**Finding:** The project has `zod@4.3.6` installed. Zod v4 (released early 2025) has API changes from v3: [CITED: zod.dev/v4]
- `z.string().email()` — same
- `z.object().safeParse()` — same
- **Breaking:** `z.union()` now requires 2+ items. `z.discriminatedUnion()` improved.
- **New:** `z.file()` for File objects. `z.json()` for JSON-safe values.
- Import from `zod/v4` or just `zod` (default export is v4 in 4.x).

**Impact:** If any code was written against Zod v3 docs, review before using. All Phase 3 schemas should be written against Zod v4 directly. No compatibility issues from scratch.

### Pitfall 3: QStash Token Unavailable in Dev

**What goes wrong:** `QSTASH_TOKEN` is not set in `.env.local`, causing `enqueueWebhook` to throw on every upload confirm in development.

**How to avoid:** Guard with env check:
```typescript
if (!process.env.QSTASH_TOKEN) {
  console.warn('[dev] QStash not configured — skipping webhook delivery');
  return;
}
```

### Pitfall 4: R2 `HeadObject` 403 vs 404

**What goes wrong:** When a file doesn't exist in R2, `HeadObjectCommand` throws a `403 Forbidden` (not `404 Not Found`) if the bucket-level access policy is restrictive. Code that only catches `404` will treat missing files as server errors.

**How to avoid:** Catch both `403` and `404` error codes when doing existence verification:
```typescript
import { S3ServiceException } from '@aws-sdk/client-s3';
try {
  await r2Client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: file.key }));
} catch (err) {
  if (err instanceof S3ServiceException && (err.$metadata.httpStatusCode === 404 || err.$metadata.httpStatusCode === 403)) {
    return serializeError(new UploadKitError('FILE_NOT_IN_STORAGE', 'File not found in storage', 422));
  }
  throw err;
}
```
[VERIFIED: PITFALLS.md #1 + AWS SDK v3 error handling patterns]

### Pitfall 5: Multipart `UploadId` Not Stored in DB

**What goes wrong:** The `init` multipart endpoint creates an R2 multipart upload and returns `uploadId`. If the client loses this ID before completing or aborting, the parts sit in R2 permanently accumulating storage costs.

**How to avoid:** Store `uploadId` in the `File` document during multipart init. The `File` model currently has no `uploadId` field — add it as an optional string field. The cron cleanup job should also call `AbortMultipartUpload` for stale UPLOADING records that have an `uploadId`. [ASSUMED: schema change needed]

### Pitfall 6: Next.js Dynamic Route Segments with `[key]`

**What goes wrong:** The file key path contains slashes (`{projectId}/{routeSlug}/{nanoid}/{filename}`). A route like `files/[key]/route.ts` will only match a single path segment.

**How to avoid:** Use catch-all routes: `files/[...key]/route.ts` to capture the full path, then `join` the segments: `params.key.join('/')`. Alternatively, use a URL-encoded key in the request and decode it in the handler. [ASSUMED: design choice for planner — URL encoding is simpler to implement]

---

## Code Examples

### Zod v4 — Upload Request Schema
```typescript
// Source: zod.dev/v4 docs
import { z } from 'zod';

export const UploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024 * 1024), // 10GB max (Enterprise)
  contentType: z.string().min(1).max(100),
  routeSlug: z.string().min(1).max(100),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UploadRequestInput = z.infer<typeof UploadRequestSchema>;
```

### Next.js Route Handler Pattern with `withApiKey`
```typescript
// Source: D-02, D-03 decisions
export const runtime = 'nodejs';

import { type NextRequest } from 'next/server';
import { withApiKey, type ApiContext } from '@/lib/with-api-key';
import { serializeError } from '@/lib/errors';

export const POST = withApiKey(async (req: NextRequest, ctx: ApiContext) => {
  const body = await req.json();
  const parsed = UploadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          type: 'invalid_request',
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }
  // ... handler logic
}, /* useUploadLimit */ true);
```

### HeadObject for R2 Verification
```typescript
// Source: @aws-sdk/client-s3 docs
import { HeadObjectCommand, S3ServiceException } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET } from '@/lib/storage';

async function verifyFileInR2(key: string): Promise<boolean> {
  try {
    await r2Client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch (err) {
    if (err instanceof S3ServiceException) {
      const status = err.$metadata.httpStatusCode;
      if (status === 404 || status === 403) return false;
    }
    throw err; // re-throw unexpected errors
  }
}
```

### Atomic Usage Increment
```typescript
// Source: PITFALLS.md #8 — MongoDB $inc for race-condition-free counters
import { UsageRecord } from '@uploadkit/db';

await UsageRecord.findOneAndUpdate(
  { userId: project.userId, period: new Date().toISOString().slice(0, 7) },
  { $inc: { storageUsed: file.size, uploads: 1 } },
  { upsert: true, new: true },
);
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Server-proxied file uploads (multer) | Presigned URL flow — client PUT directly to R2 | Eliminates server bandwidth cost, no 4.5MB Vercel body limit |
| Polling for upload completion (server-side) | Client confirms explicitly (POST /complete) | Eliminates false positives from R2 propagation lag |
| Offset-based pagination (`skip/limit`) | Cursor-based pagination (`_id` as cursor) | No duplicate/skipped records under concurrent inserts |
| `framer-motion` import | `motion` package, import `motion/react` | framer-motion package archived for updates |
| `bcrypt` (native) | `bcryptjs` (pure JS) | bcrypt native bindings fail in Vercel serverless |
| Zod v3 | Zod v4 (currently installed) | New APIs — write schemas fresh against v4 docs |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | API key should be stored as SHA256 hash, not plain text, for security | Critical Code Gaps #2 | If plain text is acceptable for MVP, no hash column needed; if hash required, model migration needed |
| A2 | `webhookUrl` should live on `FileRouter` model (per-route callbacks) | Critical Code Gaps #3 | If it lives on `Project`, all routes share one webhook URL — less flexible but simpler |
| A3 | Multipart init returns all presigned part URLs up-front | Pattern 5 | If SDK prefers fetching each part URL lazily (one request per part), the `init` endpoint design changes significantly |
| A4 | `File` model needs an optional `uploadId` field for multipart | Pitfall 5 | If uploadId is not stored, orphaned multipart parts cannot be aborted by the cron job |
| A5 | Vercel Cron is the deployment mechanism for the cleanup job | Pattern 7 | If the app is deployed to Coolify/Docker (also mentioned in GSD.md §1.2), a different scheduler is needed |
| A6 | `[...key]` catch-all routes (or URL-encoded key) for file endpoints | Pitfall 6 | If file keys never contain slashes, `[key]` single-segment routes work fine — verify key format |
| A7 | QStash DLQ callback at `/api/v1/webhooks/qstash-dlq` for D-10 failure tracking | Pattern 6 | If D-10 "mark as failed" is deferred, this endpoint can be skipped in Phase 3 |
| A8 | `export const dynamic = 'force-dynamic'` needed on cron route | Pattern 7 | If not set, Next.js may statically cache the cron response |

---

## Open Questions

1. **API key hashing strategy**
   - What we know: Current model stores plain text; creating + returning a key once is the correct pattern
   - What's unclear: Should Phase 3 implement SHA256 hashing, or is plain text acceptable for v1?
   - Recommendation: Implement SHA256 at creation time — 1 hour of work, protects users if DB is ever exposed

2. **Webhook URL location**
   - What we know: `onUploadComplete` is a per-route concept (per FileRouter config in the SDK)
   - What's unclear: Does the API-side webhook URL live on `FileRouter` or `Project`?
   - Recommendation: `FileRouter.webhookUrl` — matches SDK's per-route callback model (UploadThing pattern)

3. **QStash in local development**
   - What we know: QStash requires a public URL; Vercel provides this in preview/prod
   - What's unclear: Development workflow — does the team use ngrok, or just skip webhook delivery in dev?
   - Recommendation: Skip in dev with `console.warn`; document in README that a tunnel is needed for full local webhook testing

4. **File key slash handling**
   - What we know: Key format is `{projectId}/{routeSlug}/{nanoid}/{fileName}` — contains slashes
   - What's unclear: Should the REST API `GET /api/v1/files/:key` use a catch-all route or URL-encode the key?
   - Recommendation: URL-encode the key in the client (SDK will always do this), decode in handler — simpler than catch-all routing

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All API routes | ✓ | v22.22.0 | — |
| @aws-sdk/client-s3 | Upload/delete R2 ops | ✓ (in package.json) | 3.1026.0 | — |
| @upstash/ratelimit | Rate limiting | ✓ (in package.json + lib/) | latest | — |
| @upstash/qstash | Async webhooks | ✗ (not installed) | 2.10.1 available | Skip webhook in dev |
| @uploadkit/db | All DB access | ✗ (not in api/package.json) | workspace | Blocks all route development |
| @uploadkit/shared | Errors, constants | ✗ (not in api/package.json) | workspace | Blocks error handling |
| nanoid | File key generation | ✗ (not in api/package.json) | 5.1.7 available | — |
| QSTASH_TOKEN env var | QStash client init | Unknown | — | Guard with env check for dev |
| CRON_SECRET env var | Cron auth | Unknown | — | Must be set in Vercel env |

**Missing dependencies with no fallback:**
- `@uploadkit/db` workspace dep in `apps/api/package.json` — blocks all route development (Wave 0 task)
- `@uploadkit/shared` workspace dep in `apps/api/package.json` — blocks error handling (Wave 0 task)

**Missing dependencies with fallback:**
- `@upstash/qstash` — can skip webhook delivery in dev with env guard
- `QSTASH_TOKEN` — guard allows dev to proceed without it

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (latest, v4.x) |
| Config file | None found in `apps/api/` — Wave 0 must create `vitest.config.ts` |
| Quick run command | `pnpm --filter @uploadkit/api test` |
| Full suite command | `pnpm --filter @uploadkit/api test --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UPLD-01 | POST /upload/request validates API key, tier, type, size | unit (mock DB + R2) | `vitest run src/app/api/v1/upload/request` | ❌ Wave 0 |
| UPLD-03 | POST /upload/complete verifies R2, stores metadata, enqueues webhook | unit (mock HeadObject + QStash) | `vitest run src/app/api/v1/upload/complete` | ❌ Wave 0 |
| UPLD-04 | Multipart init/complete/abort flow | unit (mock AWS SDK) | `vitest run src/app/api/v1/upload/multipart` | ❌ Wave 0 |
| UPLD-09 | Cron cleanup removes UPLOADING records older than 1h | unit (mock Date, DB) | `vitest run src/app/api/cron/cleanup` | ❌ Wave 0 |
| API-01 | withApiKey returns 401 on missing/revoked key | unit | `vitest run src/lib/with-api-key` | ❌ Wave 0 |
| API-02 | File list pagination, delete | unit | `vitest run src/app/api/v1/files` | ❌ Wave 0 |
| API-08 | Error responses match Stripe format | unit | `vitest run src/lib/errors` | ❌ Wave 0 |
| UPLD-01 | Tier limit enforcement (free tier file size) | unit | included in upload/request tests | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @uploadkit/api test --run`
- **Per wave merge:** `pnpm --filter @uploadkit/api test --coverage`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `apps/api/vitest.config.ts` — Vitest config with Next.js environment
- [ ] `apps/api/src/__tests__/setup.ts` — shared mocks for DB, R2 client
- [ ] `apps/api/src/lib/__tests__/with-api-key.test.ts` — covers API-01
- [ ] `apps/api/src/lib/__tests__/errors.test.ts` — covers API-08 error format
- [ ] Framework install already satisfied (vitest in workspace root)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes — API key auth | `withApiKey` wrapper; SHA256 key hash in DB |
| V3 Session Management | No — stateless API key auth | n/a |
| V4 Access Control | Yes — project scoping | All queries scoped to `project._id` from auth context |
| V5 Input Validation | Yes | Zod schemas on all request bodies |
| V6 Cryptography | Yes — API key storage | SHA256 for key hash; HMAC for webhook signatures |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Upload type bypass (upload .exe as image/png) | Tampering | Content-Type locked in presigned URL signature; magic-byte check post-upload (Phase 3 or Phase 4) |
| API key brute force | Elevation of Privilege | Rate limit on withApiKey; key prefix (uk_live_) reduces guessable namespace |
| Tier limit bypass (manipulate fileSize in request) | Tampering | Server validates fileSize ≤ tier max AND R2 presigned URL locks ContentLength — double enforcement |
| Webhook forgery (replay developer's callback URL) | Spoofing | HMAC signature on webhook payload with WEBHOOK_SECRET |
| Orphaned file accumulation (DoS on storage quota) | DoS | Cron cleanup; presigned URL 15-minute expiry; tier storage quota check before presigning |
| CORS wildcard enabling unauthorized browser uploads | Tampering | R2 CORS config (Phase 1) uses explicit AllowedOrigins + AllowedHeaders — already set |
| Concurrent upload race condition on usage counter | Tampering | Atomic `$inc` MongoDB operations |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase] — `apps/api/src/lib/storage.ts`, `presign.ts`, `rate-limit.ts` — existing utilities confirmed
- [VERIFIED: codebase] — All Mongoose models in `packages/db/src/models/` — interface + index definitions confirmed
- [VERIFIED: codebase] — `packages/shared/src/constants.ts` — TIER_LIMITS, FILE_STATUSES, API_KEY_PREFIX confirmed
- [VERIFIED: codebase] — `packages/shared/src/errors.ts` — UploadKitError hierarchy confirmed
- [VERIFIED: npm registry] — `@upstash/qstash@2.10.1`, `zod@4.3.6`, `@aws-sdk/client-s3@3.1026.0`, `nanoid@5.1.7`, `bcryptjs@3.0.3`
- [CITED: .planning/research/PITFALLS.md] — R2 HeadObject 403/404, multipart ETag, CORS, rate limit keying, $inc atomics
- [CITED: .planning/research/STACK.md] — Library versions, compatibility matrix
- [CITED: .planning/research/ARCHITECTURE.md] — Upload flow, multipart flow, withApiKey auth flow patterns

### Secondary (MEDIUM confidence)
- [CITED: upstash.com/docs/qstash] — QStash publishJSON API, retries, callbacks/DLQ
- [CITED: zod.dev/v4] — Zod v4 API changes from v3
- [CITED: developers.cloudflare.com/r2/api/s3/presigned-urls/] — Multipart commands, HeadObject behavior

### Tertiary (LOW confidence — marked ASSUMED in research)
- Multipart init returning all part URLs up-front (vs lazy per-part) — A3
- API key SHA256 hashing as v1 requirement — A1
- `webhookUrl` on FileRouter vs Project — A2

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against npm registry and codebase
- Architecture patterns: HIGH — based on existing code + prior research documents + official docs
- Critical gaps: HIGH — verified by direct codebase inspection
- QStash specifics: MEDIUM — cited from official docs; version confirmed from registry
- Assumptions: LOW — architectural decisions left to planner

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable stack; QStash API unlikely to change in 30 days)
