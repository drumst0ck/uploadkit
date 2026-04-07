# Pitfalls Research

**Domain:** File Uploads as a Service (FUaaS) — presigned URL flow, Cloudflare R2, MongoDB/serverless, npm SDK, Stripe metered billing, Turborepo monorepo
**Researched:** 2026-04-07
**Confidence:** HIGH (majority verified against official docs and multiple independent sources)

---

## Critical Pitfalls

### Pitfall 1: Presigned URL with No Server-Side File Type Enforcement

**What goes wrong:**
The API generates a presigned PUT URL with a content-type baked into the signature. The client then uploads a completely different file type — or sends a request with no Content-Type header — and R2 accepts it. Client-side validation is bypassed entirely with a single `curl` command. Malicious executables, HTML files for stored XSS, or oversized content land in the bucket.

**Why it happens:**
Developers assume the presigned URL's content-type parameter enforces the file type at the storage layer. R2/S3 only validates that the Content-Type header matches what was signed — it does not inspect the actual file bytes. A client can sign with `image/png` and upload a PHP shell renamed to `.png`. The signature matches; R2 accepts it.

**How to avoid:**
- Lock the presigned URL to a specific `Content-Type` value AND add a `Content-Length` constraint matching the expected file size at signing time
- After the client confirms upload, use an R2 Worker or a post-upload job to read the first bytes (magic bytes check) before updating the file status from `pending` to `ready`
- Never serve user-uploaded content from the same origin as the app — use `cdn.uploadkit.dev` with `Content-Disposition: attachment` for non-image types
- Implement server-side allowlist of MIME types per FileRouter config, validated before presigning

**Warning signs:**
- FileRouter config accepts MIME types but validation only runs client-side in the SDK
- No magic-byte check after upload confirmation
- CDN serves files from the same domain as the dashboard

**Phase to address:** Upload Core (presigned URL flow implementation phase)

---

### Pitfall 2: The "Upload-But-Never-Confirm" Orphan Problem

**What goes wrong:**
The client receives a presigned URL, uploads successfully to R2, then crashes, loses network, or simply abandons the flow before calling the confirmation endpoint. The file exists in R2 in `status: pending` forever. Over time, the bucket fills with unreferenced objects that count against storage — and if they are multipart uploads, the incomplete parts accumulate invisible storage charges.

**Why it happens:**
The two-step presigned URL flow (generate → upload → confirm) has no automatic completion guarantee. The confirm step is a separate client HTTP call that is not guaranteed to fire. Multipart uploads are worse: R2 holds all uploaded parts until `CompleteMultipartUpload` is called or the upload is aborted, and these parts bill at the same rate as real objects.

**How to avoid:**
- Set a `pendingExpiresAt` timestamp on the File document when generating the presigned URL (e.g., 1 hour)
- Run a scheduled cleanup job (cron or Cloudflare Scheduled Worker) that queries `File.find({ status: 'pending', pendingExpiresAt: { $lt: new Date() } })` and calls `DeleteObject` on each, then removes the record
- Configure R2 lifecycle rules to auto-abort incomplete multipart uploads after 1 day (R2 defaults to 7 days — too long)
- For multipart: always call `AbortMultipartUpload` in SDK error handlers before surfacing the error to the user

**Warning signs:**
- No `pendingExpiresAt` field on the File model
- No cron job or scheduled task to clean up stale pending files
- R2 bucket has no lifecycle rule for `AbortIncompleteMultipartUploads`
- Growing `pending` count in the file browser with no corresponding uploads

**Phase to address:** Upload Core phase; revisit in Billing phase when storage metering is implemented

---

### Pitfall 3: R2 CORS Misconfiguration Kills Browser Uploads

**What goes wrong:**
Browser-based uploads to presigned URLs fail with CORS errors, even though the URL is valid and the API key is correct. The upload works from curl but not from the browser. This is one of the most commonly reported R2 issues and wastes days of debugging.

**Why it happens:**
Presigned URLs authenticate at the S3 API layer, but CORS is enforced by the browser before the request even reaches the authentication check. Without an explicit CORS policy on the R2 bucket allowing PUT from the app's origin, the browser's preflight OPTIONS request gets rejected. Additionally, R2 does not accept wildcard `AllowedHeaders: ["*"]` — it must be an explicit list.

**How to avoid:**
- Configure R2 CORS policy before writing any upload code:
  ```json
  [
    {
      "AllowedOrigins": ["https://uploadkit.dev", "http://localhost:3000"],
      "AllowedMethods": ["PUT"],
      "AllowedHeaders": ["Content-Type", "Content-Length"],
      "MaxAgeSeconds": 3600
    }
  ]
  ```
- Never use wildcard for `AllowedHeaders` — R2 rejects it
- Presigned URLs only work with the S3 API domain (`*.r2.cloudflarestorage.com`), not with custom domains — do not attempt to use `cdn.uploadkit.dev` as the presign endpoint
- Test CORS configuration before implementing any SDK upload logic

**Warning signs:**
- Upload works from Postman/curl but fails from browser
- Console shows `No 'Access-Control-Allow-Origin' header` or `Method PUT is not allowed by Access-Control-Allow-Methods`
- CORS config uses `AllowedHeaders: ["*"]`

**Phase to address:** Infrastructure setup phase (before any upload code is written)

---

### Pitfall 4: BYOS Credential Leakage via Client-Side SDK

**What goes wrong:**
In BYOS mode, the SDK accidentally exposes the customer's S3/R2 credentials to the browser. This can happen through: bundle analysis revealing credentials in client JS, `next.config.js` accidentally adding `NEXT_PUBLIC_` prefix to secrets, or an SDK design that passes credentials through the client component props.

**Why it happens:**
Next.js has a hard rule: only `NEXT_PUBLIC_*` variables reach the client bundle. But developers in a hurry sometimes pass BYOS credentials as component props or store them in client-accessible state. SDK design that doesn't enforce the server-handler pattern makes this easy to do accidentally.

**How to avoid:**
- The BYOS credential path must only exist in the server-side route handler (`createUploadKitHandler`) — credentials are never passed to `@uploadkit/react` components
- `@uploadkit/core` BYOS mode must be explicitly marked with a JSDoc comment and TypeScript error if instantiated in a browser environment (check `typeof window !== 'undefined'`)
- Add a build-time check in the Next.js handler that throws if any BYOS credential appears in `NEXT_PUBLIC_*` env variables
- Document clearly: BYOS config goes in the API route, never in the component tree

**Warning signs:**
- Bundle analyzer shows `accessKeyId` or `secretAccessKey` strings in client JS
- BYOS config object passed as React component prop
- `NEXT_PUBLIC_BYOS_SECRET` in `.env.example`

**Phase to address:** SDK Core phase (`@uploadkit/core` BYOS implementation) — enforce at the type system level

---

### Pitfall 5: Multipart Upload — Wrong Part Size and Missing ETag Collection

**What goes wrong:**
Multipart uploads fail at the `CompleteMultipartUpload` step because: (a) parts smaller than 5 MiB were sent (except the last), (b) ETags were not collected from each part's response headers, or (c) parts were sent out of order. The complete operation silently fails or returns a malformed object with an unexpected ETag format.

**Why it happens:**
R2's minimum part size is 5 MiB (not 5 MB — MiB). The `CompleteMultipartUpload` call requires the exact list of `{ PartNumber, ETag }` objects in order — the ETag must be captured from each `UploadPart` response's `ETag` header, not computed client-side. ETag values for multipart objects differ from single-PUT objects (they are a hash of concatenated binary MD5 sums, not the MD5 of the file).

**How to avoid:**
- Hardcode the minimum part size as `5 * 1024 * 1024` bytes (5 MiB) in `@uploadkit/core`
- The threshold for switching to multipart should be slightly above 5 MiB, not arbitrary (PROJECT.md says >10MB — that's fine, but enforce 5 MiB minimum part size within the multipart logic)
- Collect ETags from response headers in the UploadPart loop before assembling the complete request
- The complete-multipart endpoint on the UploadKit API should receive the ETag list from the client and verify part count matches before calling R2
- Unit test multipart with a 12 MiB file (2 full parts + small last part) and a 5.1 MiB file (edge case)

**Warning signs:**
- `CompleteMultipartUpload` calls with an empty `Parts` array
- ETag computed from file bytes client-side instead of captured from `UploadPart` response headers
- Part size set to an arbitrary value like 1 MB

**Phase to address:** Upload Core phase (multipart implementation in `@uploadkit/core`)

---

### Pitfall 6: MongoDB Connection Storming in Serverless

**What goes wrong:**
Under load, the Next.js API app creates a new MongoDB connection per serverless function invocation. MongoDB Atlas hits the 500-connection limit, Atlas throttles connections, and API requests start failing with timeout errors. This is invisible during development (single process) and only surfaces in production under concurrent load.

**Why it happens:**
Serverless functions are stateless — each cold start opens a new connection unless the connection is cached at the module level. Without the cached-connection pattern, a spike of 100 concurrent API requests can spawn 100 MongoDB connections simultaneously. The Next.js dev server re-imports modules constantly during hot reload, compounding the issue in development.

**How to avoid:**
- Implement the canonical cached connection pattern at the module level using a global:
  ```typescript
  // packages/db/src/client.ts
  const globalWithMongoose = global as typeof global & { mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } };
  ```
- Set `maxPoolSize: 10` in the Mongoose connection options for production, `maxPoolSize: 1` for local development
- Set `serverSelectionTimeoutMS: 5000` to fail fast on bad configs rather than hanging
- Add connection status monitoring to the dashboard's health check endpoint
- This pattern must be in `packages/db` — never duplicated in individual apps

**Warning signs:**
- MongoDB Atlas Atlas console shows "Connections % of configured limit above 80%"
- Each API file does its own `mongoose.connect()` call
- No `global.mongoose` cache in the db package

**Phase to address:** Monorepo setup / database package phase (must be solved before any API routes are written)

---

### Pitfall 7: Stripe Metered Billing — Legacy API vs. Billing Meters

**What goes wrong:**
The team implements metered billing using `usage_type: 'metered'` and `UsageRecord` APIs from tutorials, then discovers these are removed in Stripe API version `2025-03-31.basil`. The billing infrastructure has to be rewritten from scratch, breaking existing subscriptions. Alternatively, meter events are sent without idempotency keys, causing double-billing during retries.

**Why it happens:**
The internet is full of tutorials using the legacy metered billing API. As of Stripe's `2025-03-31.basil` API version, all metered prices must be backed by a Meter object. The old `UsageRecord` endpoints are gone. Additionally, Stripe's meter events are write-only — you cannot query them back for reconciliation, making debugging blind.

**How to avoid:**
- Use Stripe's current Meters API from day one — create a `Meter` object for each billable dimension (storage GB, bandwidth GB, upload count)
- Always set the `identifier` field on meter events (idempotency key derived from your internal UsageRecord ID) to prevent double-counting on retries
- Keep `UsageRecord` in MongoDB as the source of truth — Stripe is for billing, your DB is for display, debugging, and audit
- Set up webhook monitoring for `meter_event_customer_not_found` errors — these indicate a customer ID sync bug
- Never use Stripe meter event summaries to power the in-app usage dashboard — query MongoDB instead

**Warning signs:**
- Code references `stripe.subscriptionItems.createUsageRecord()`
- No `identifier` field on meter event calls
- In-app usage charts query Stripe's API instead of MongoDB

**Phase to address:** Billing phase — must audit Stripe API version compatibility before writing any billing code

---

### Pitfall 8: Usage Metering Race Condition — Concurrent Uploads Double-Count Storage

**What goes wrong:**
Two simultaneous uploads from the same project both read the current `storageUsedBytes` value (say, 4 GB), both add their file size, and both write back `4 GB + fileSize` — one write wins and the other's increment is lost. Storage usage underreports. Alternatively, the post-upload usage update is done with a standard `findOneAndUpdate` without atomic operators, creating a TOCTOU (Time-Of-Check-Time-Of-Use) window.

**Why it happens:**
Standard `findOneAndUpdate` with a read-compute-write pattern is not atomic. When multiple serverless function instances process concurrent uploads, they all read stale values before any of them writes. MongoDB's `$inc` operator is the correct tool but is often overlooked.

**How to avoid:**
- Always use `$inc` for updating numeric counters in `Project` and `UsageRecord` documents:
  ```typescript
  await Project.findByIdAndUpdate(projectId, {
    $inc: { storageUsedBytes: file.size }
  });
  ```
- For the bandwidth counter (incremented on CDN serving), consider a write-through counter in Upstash Redis flushed to MongoDB every minute — Redis is atomic for increments
- Add a scheduled reconciliation job that recomputes `storageUsedBytes` from the sum of all `File.size` values for the project and corrects drift nightly

**Warning signs:**
- `project.storageUsedBytes = project.storageUsedBytes + file.size` followed by `project.save()`
- No `$inc` operator used anywhere in upload-related code
- Monitoring shows storage displayed in dashboard doesn't match sum of file sizes

**Phase to address:** Upload Core phase (post-upload metadata update); Billing phase (reconciliation job)

---

### Pitfall 9: SDK Published Without Proper Tree-Shaking Configuration

**What goes wrong:**
`@uploadkit/react` bundles all components into a single chunk. Users who only need `<UploadButton>` get the full `<UploadDropzone>`, `<UploadModal>`, and `<FilePreview>` in their bundle. The package also accidentally bundles React itself instead of declaring it as a peer dependency, causing the "multiple React instances" error in consumer apps.

**Why it happens:**
Rollup/tsup needs explicit configuration to produce ESM output with named exports that bundlers can tree-shake. Without `"sideEffects": false` in `package.json`, bundlers assume every import has side effects and skip tree-shaking. Forgetting `external: ['react', 'react-dom']` in the build config causes React to be bundled twice.

**How to avoid:**
- Set `"sideEffects": false` in all SDK `package.json` files (or `"sideEffects": ["*.css"]` if CSS imports exist)
- Configure `tsup` or Rollup to output both `esm` and `cjs` formats with explicit `external: ['react', 'react-dom']`
- Declare `react` and `react-dom` as `peerDependencies`, not `dependencies`
- Use `exports` field in `package.json` with explicit named entry points per component
- Run `pnpm pack` and inspect the tarball before first publish — verify no `react` in the bundle
- Test import size with `bundlephobia` or `pkg-size.dev` after every major change

**Warning signs:**
- `"react": "^18.0.0"` in `dependencies` instead of `peerDependencies`
- No `"sideEffects"` field in `package.json`
- `tsup` config missing `external` array
- Consumer app throws "Invalid hook call" or "Cannot update a component while rendering"

**Phase to address:** SDK packaging phase (before first npm publish)

---

### Pitfall 10: Changesets Mid-Publish Failure Leaves Monorepo in Inconsistent State

**What goes wrong:**
Changesets publishes `@uploadkit/core` successfully, then fails on `@uploadkit/react` due to a network error or npm registry timeout. `@uploadkit/react` still references the old `@uploadkit/core` version in its `package.json`, but npm has the new core. Consumers who install `@uploadkit/react` get a mismatched core version.

**Why it happens:**
Changesets publishes packages sequentially. If it fails mid-sequence, it does not roll back. The published packages have their new versions on npm but the unpublished packages still reference old peer versions. This is especially dangerous when `@uploadkit/react` has `@uploadkit/core` as a peer dependency.

**How to avoid:**
- Configure Changesets' `updateInternalDependencies` to `"patch"` so internal version ranges update automatically
- The GitHub Actions publish workflow should retry on failure with `--no-git-tag` to rerun safely
- After every publish, run a verification step: `npm view @uploadkit/react peerDependencies` to confirm versions are consistent
- Prefix releases with a dry-run: `changeset publish --dry-run` to surface issues before touching the registry
- Pin internal packages to exact versions in the initial setup (e.g., `"@uploadkit/core": "workspace:*"`) so local dev always uses the monorepo version

**Warning signs:**
- GitHub Actions publish job has no retry logic
- `@uploadkit/react/package.json` shows a different `@uploadkit/core` version than the one just published
- No post-publish verification step in CI

**Phase to address:** CI/CD setup phase and SDK publishing phase

---

### Pitfall 11: API Key Authentication Bypassed in Edge Middleware

**What goes wrong:**
The Next.js middleware validates session cookies for the dashboard routes but the API routes (`/api/v1/*`) are supposed to validate `uk_live_*` API keys. If the middleware runs on the Edge runtime and tries to call MongoDB to validate the API key, it fails silently or throws a Node.js module incompatibility error, causing all API requests to be rejected (or worse, accepted without validation).

**Why it happens:**
Auth.js v5 middleware runs on the Edge runtime. MongoDB/Mongoose requires TCP sockets — not available in Edge. Developers try to do API key validation in middleware.ts, it fails in Edge, and they either disable auth (security hole) or block everything (availability hole). The correct pattern is to validate API keys inside the route handler itself, not in middleware.

**How to avoid:**
- Middleware.ts should only handle session cookie validation for dashboard routes — use the Auth.js `auth()` helper with JWT strategy (no DB call in Edge)
- API key validation (`uk_live_*` / `uk_test_*` lookup) must happen inside the API route handler where Node.js runtime is available
- Create a `validateApiKey(request)` utility in `packages/db` that wraps the Mongoose lookup, and call it at the top of every API route handler
- Use a `matcher` in middleware.ts to exclude `/api/v1/*` from Auth.js processing entirely
- Rate limiting (Upstash) is appropriate in middleware since it uses HTTP-based Redis — this is the correct Edge concern

**Warning signs:**
- `middleware.ts` imports from `mongoose` or `packages/db`
- API routes have no `validateApiKey` call at the start
- Auth.js middleware matcher includes `/api/v1/*`

**Phase to address:** API foundation phase (before any API routes are implemented)

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip post-upload file type verification | Faster MVP | Stored XSS, malware hosting, abuse | Never — add magic-byte check from day one |
| Poll for upload confirmation from API instead of waiting for client confirm | Simpler SDK | False positives if R2 propagation is slow, increased API cost | Never — client-confirm is architecturally correct |
| Store bandwidth usage only in MongoDB via post-request middleware | Simple implementation | Massive accuracy loss; serverless functions don't reliably fire after response | MVP acceptable; move to CDN log ingestion in v2 |
| Use `status: 'done'` immediately on presigned URL generation | Simpler flow | Files appear "ready" before upload completes | Never |
| Single-tenant CORS config (`AllowedOrigins: ["*"]`) in R2 | Easy local dev | Security and CORS bypass risk in production | Local dev only — never ship |
| Skip Changesets on patch releases | Faster iteration | Version drift, broken consumers, trust erosion | Never for published SDK packages |
| Hardcode Stripe price IDs in code | Simple initial setup | Requires code deploy to change pricing | Acceptable in MVP if behind a config constant, not scattered inline |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Cloudflare R2 | Using `AllowedHeaders: ["*"]` in CORS policy | Explicitly list `["Content-Type", "Content-Length"]` |
| Cloudflare R2 | Generating presigned URLs pointing to custom domain (`cdn.uploadkit.dev`) | Presigned URLs must use the S3 API endpoint (`*.r2.cloudflarestorage.com`) |
| Cloudflare R2 | Using POST Object API (HTML form upload) | R2 does not support POST Object — use PUT presigned URLs only |
| Cloudflare R2 | No lifecycle rule for aborted multipart uploads | Set `AbortIncompleteMultipartUploads` lifecycle rule to 1 day |
| Stripe Billing | Using `UsageRecord` API (legacy) | Use Stripe Meters API — legacy removed in `2025-03-31.basil` |
| Stripe Billing | Meter events without `identifier` field | Always set identifier from internal UsageRecord `_id` for idempotency |
| Stripe Webhooks | Not verifying webhook signature | Always verify `stripe-signature` header with `stripe.webhooks.constructEvent()` |
| MongoDB/Mongoose | `mongoose.connect()` per route file | Cached connection in `packages/db/src/client.ts` using global cache |
| Auth.js v5 | MongoDB adapter in Edge middleware | Use JWT strategy + split config; move DB adapter to route handlers only |
| Upstash Redis | Rate limiting keyed only by IP | Key by `apiKeyId` for authenticated routes — IPs are shared/VPN-masked |
| npm publish | Publishing without `files` field in package.json | Set `"files": ["dist"]` — or entire `src/` and `__tests__` ship to npm |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Querying all files for a project without index on `projectId` | File browser loads slowly; Atlas shows collection scans | Add compound index `{ projectId: 1, createdAt: -1 }` on File model | >1,000 files per project |
| Calculating storage usage with `File.aggregate()` on every dashboard load | Dashboard usage widget is slow | Cache `storageUsedBytes` on Project document, update with `$inc` on upload/delete | >10,000 files per project |
| Fetching usage records for billing without period index | Monthly bill calculation is slow | Index `{ projectId: 1, period: 1 }` on UsageRecord | >12 periods stored per project |
| Presigned URL expiry too long (>1 hour) | Expired URLs used legitimately; security exposure | Set expiry to 15 minutes — generous but not open-ended | Any time |
| No pagination in file browser API | Browser tab hangs for projects with many files | Always paginate: `limit: 50, cursor: lastId` | >200 files per project |
| Multipart upload: chunk size too small (< 5 MiB) | `EntityTooSmall` errors from R2 on all but last part | Enforce minimum 5 MiB chunk size in `@uploadkit/core` | Every multipart upload |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Presigned URL generated without Content-Type constraint | Any file type uploadable regardless of FileRouter config | Always include `ContentType` in presigned URL params |
| No server-side file size validation before generating URL | Users bypass tier limits by uploading huge files | Validate `fileSize <= tierLimit` before presigning |
| API key stored as plain text in MongoDB | Key exposure via DB dump | Hash the key with `bcrypt` or `sha256` — store prefix+hash, return full key only at creation time |
| BYOS credentials stored in browser localStorage or component state | Credentials exposed in browser memory/storage | BYOS path only in Next.js API route handler — never in React component tree |
| Serving user-uploaded files from same origin as app | Stored XSS via HTML/SVG file uploads | Serve all uploads from `cdn.uploadkit.dev` with `Content-Disposition: attachment` for non-image MIME types |
| No rate limiting on presigned URL generation endpoint | Attacker generates millions of upload URLs, exhausting tier limits | Rate limit presign endpoint per API key with Upstash (`10 req/min` per key for free tier) |
| Webhook endpoint without signature verification | Forged Stripe events manipulate billing state | Always use `stripe.webhooks.constructEvent()` before processing any webhook |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress feedback during multipart upload | Users think upload is frozen for large files | Track per-part progress in `@uploadkit/core`, aggregate in `useUploadKit` hook |
| Generic error messages on upload failure ("Upload failed") | Users can't diagnose or retry correctly | Map R2/network errors to actionable messages ("File too large", "Invalid file type", "Network error — retrying") |
| Upload button disabled during upload with no way to cancel | Users stuck waiting for bad uploads | Expose `abort()` from `useUploadKit` hook, show cancel button during upload |
| No visual differentiation between `pending` and `ready` files in file browser | Users think upload succeeded before confirmation | File browser must show status badges; `pending` files should animate |
| Dashboard refreshes full page to show new uploads | Jarring UX, loses scroll position | Poll `/api/v1/logs` endpoint and merge new files into existing list without full reload |
| SDK components require custom CSS overrides for basic customization | Developers fight the component styles | Expose all visual properties as CSS custom properties (`--uploadkit-accent`, `--uploadkit-radius`) |

---

## "Looks Done But Isn't" Checklist

- [ ] **Presigned URL flow:** File is in R2 — but is `status` updated to `ready`? Verify client confirm endpoint is called and file document is updated
- [ ] **Multipart upload:** Upload completes — but was `CompleteMultipartUpload` called? Verify R2 shows a single object, not dangling parts
- [ ] **BYOS mode:** Upload works in managed mode — but does BYOS use the developer's own credentials? Verify with a separate test bucket
- [ ] **SDK tree-shaking:** Package builds — but does importing only `<UploadButton>` result in a small bundle? Verify with bundle analyzer
- [ ] **Stripe billing:** Subscription created — but are overage meter events actually being sent? Verify with Stripe test meter event dashboard
- [ ] **API key validation:** `/api/v1/*` routes return data — but are they rejecting requests with invalid API keys? Verify with no-auth and wrong-key requests
- [ ] **MongoDB connection cache:** API works under single requests — but what happens under 50 concurrent requests? Check Atlas connection count
- [ ] **R2 CORS:** Upload works from Postman — but does it work from browser on `localhost:3000`? Verify with Network tab CORS headers
- [ ] **File deletion:** File removed from UI — but is it deleted from R2 too? And is `storageUsedBytes` decremented?
- [ ] **Usage metering:** Upload recorded — but is the per-project storage counter accurate under concurrent uploads? Verify with parallel upload test

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Content-type bypass discovered post-launch | HIGH | Audit all uploaded files for malicious content; add magic-byte check to post-upload worker; scan and quarantine suspect files |
| Orphaned pending files accumulated | LOW | Run one-time cleanup script: `File.find({ status: 'pending', createdAt: { $lt: cutoff } })`, delete from R2, remove records |
| MongoDB connection storming in production | MEDIUM | Add cached connection pattern and redeploy; temporarily scale Atlas tier to handle connection burst |
| Stripe legacy API removed mid-development | HIGH | Migrate all metered prices to Meter-backed prices; existing subscriptions may need migration; test against Stripe test clock |
| SDK published without tree-shaking | LOW | Publish patch with correct `sideEffects: false` and ESM exports; announce in changelog |
| Changesets mid-publish failure | MEDIUM | Manually publish failed packages with `pnpm publish --no-git-checks`; verify version consistency across all packages |
| BYOS credentials leaked client-side | CRITICAL | Rotate all affected customer credentials immediately; audit access logs; patch SDK; notify affected customers |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Presigned URL file type bypass | Upload Core (presigned URL implementation) | Integration test: upload `.exe` renamed to `.png` — must be rejected or quarantined |
| Orphaned pending files | Upload Core + scheduled job | E2E test: abort upload mid-flight, verify cleanup job removes the pending record |
| R2 CORS misconfiguration | Infrastructure setup (before any upload code) | Browser upload test from localhost before any SDK work |
| BYOS credential leakage | SDK Core (`@uploadkit/core` BYOS mode) | Bundle analysis: `@uploadkit/core` client bundle must not contain credential strings |
| Multipart part size / ETag errors | Upload Core (multipart implementation) | Unit tests with 5.1 MiB, 12 MiB, and 100 MiB file fixtures |
| MongoDB connection storming | Monorepo setup / DB package | Load test: 50 concurrent API requests — Atlas connection count must stay below 50 |
| Stripe legacy API usage | Billing phase setup | Stripe API version pinned to `2025-03-31.basil` or later in client config |
| Usage metering race condition | Upload Core (post-upload metadata) + Billing | Concurrent upload test: 10 simultaneous uploads — storage counter must equal sum of file sizes |
| SDK tree-shaking broken | SDK packaging (pre-publish) | `bundlephobia` check after build — `@uploadkit/react` must be < 50 kB for single component import |
| Changesets mid-publish failure | CI/CD setup | Publish dry-run in CI; post-publish version consistency check |
| API key auth bypassed in Edge | API foundation phase | Test: request to `/api/v1/files` with no key → 401; with wrong key → 401; with valid key → 200 |

---

## Sources

- [Cloudflare R2 Presigned URLs documentation](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [Cloudflare R2 CORS configuration](https://developers.cloudflare.com/r2/buckets/cors/)
- [Cloudflare Community: 403 error uploading to R2 via presigned URL](https://community.cloudflare.com/t/403-error-when-uploading-to-r2-bucket-from-client-via-a-pre-signed-url/637373)
- [Cloudflare Community: Browser upload fails with R2 large files (POST 501)](https://github.com/CapSoftware/cap/issues/1684)
- [AWS: Securing presigned URLs for serverless applications](https://aws.amazon.com/blogs/compute/securing-amazon-s3-presigned-urls-for-serverless-applications/)
- [AWS: Discovering and deleting incomplete multipart uploads](https://aws.amazon.com/blogs/aws-cloud-financial-management/discovering-and-deleting-incomplete-multipart-uploads-to-lower-amazon-s3-costs/)
- [AWS Prescriptive Guidance: Presigned URL best practices](https://docs.aws.amazon.com/pdfs/prescriptive-guidance/latest/presigned-url-best-practices/presigned-url-best-practices.pdf)
- [Detectify Labs: Bypassing bucket upload policies and signed URLs](https://labs.detectify.com/writeups/bypassing-and-exploiting-bucket-upload-policies-and-signed-urls/)
- [WithSecure Labs: Pre-signed at your service (security research)](https://labs.withsecure.com/publications/pre-signed-at-your-service)
- [Stripe: Usage-based billing implementation guide](https://docs.stripe.com/billing/subscriptions/usage-based/implementation-guide)
- [Stripe: Migrate to billing meters](https://docs.stripe.com/billing/subscriptions/usage-based-legacy/migration-guide)
- [Prefab: Usage-based billing with Stripe Meters](https://prefab.cloud/blog/usage-based-billing-with-stripe-meters/)
- [This Dot Labs: Next.js + MongoDB connection storming](https://www.thisdot.co/blog/next-js-mongodb-connection-storming)
- [Auth.js: Edge compatibility guide](https://authjs.dev/guides/edge-compatibility)
- [Changesets: GitHub repository and docs](https://github.com/changesets/changesets)
- [Upstash: Rate limiting library for serverless](https://github.com/upstash/ratelimit-js)
- [Vayu: Implementing metered billing pitfalls](https://www.withvayu.com/blog/implementing-metered-billing-software)

---
*Pitfalls research for: File Uploads as a Service (UploadKit)*
*Researched: 2026-04-07*
