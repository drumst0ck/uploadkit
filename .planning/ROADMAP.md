# Roadmap: UploadKit

## Overview

UploadKit ships in 10 phases derived from its requirement categories and their natural dependencies. Phase 1 establishes the monorepo and all infrastructure primitives — R2, MongoDB, Redis, Sentry, CI/CD — so every subsequent phase builds on a stable, observable foundation. Phases 2-5 build the product core: auth, the upload API, and the full SDK surface (core, Next.js, React). Phases 6-7 deliver the SaaS shell — dashboard and billing with metered Stripe integration. Phases 8-9 build the public-facing web (landing, pricing, docs). Phase 10 closes the loop with end-to-end testing, npm publish, and launch readiness.

## Phases

**Phase Numbering:**
- Integer phases (1-10): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Monorepo & Infrastructure** - Turborepo monorepo, R2, MongoDB, Redis, Sentry, CI/CD, Changesets (completed 2026-04-07)
- [ ] **Phase 2: Authentication** - Auth.js v5 with GitHub, Google, and magic link; persistent sessions
- [ ] **Phase 3: Upload Flow & REST API** - Presigned URL pipeline, multipart, abort/retry, full file/project/key REST API
- [ ] **Phase 4: SDK Core & Next.js Adapter** - @uploadkit/core factory, BYOS mode, @uploadkit/next file router pattern
- [ ] **Phase 5: SDK React Components** - UploadButton, Dropzone, Modal, FileList, FilePreview, hook, theming, a11y
- [ ] **Phase 6: Dashboard** - Auth shell, project/file/key management, upload logs, usage, command palette
- [ ] **Phase 7: Billing & Email** - Stripe Checkout, Billing Portal, metered overages, Resend transactional emails
- [ ] **Phase 8: Landing & Pricing Pages** - Hero, code demo, feature grid, competitor table, pricing page
- [ ] **Phase 9: Documentation** - Fumadocs site, quickstart, SDK reference, API reference, guides
- [ ] **Phase 10: Testing, Publishing & Launch** - Vitest unit tests, Playwright E2E, npm publish, launch readiness

## Phase Details

### Phase 1: Monorepo & Infrastructure
**Goal**: The full repository skeleton exists with all shared tooling, cloud services configured, and CI/CD running — every future phase can scaffold on top of this without revisiting infrastructure
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08, INFRA-09
**Success Criteria** (what must be TRUE):
  1. Running `pnpm install && pnpm build` from repo root succeeds across all apps and packages with zero errors
  2. A developer can import Mongoose models from `packages/db` in any app without hitting a connection error — cached connection is verified in a test script
  3. Cloudflare R2 bucket is reachable and a presigned PUT URL request returns 200 (CORS headers present and correct)
  4. GitHub Actions CI run completes green on a clean push (lint, type-check, build pass)
  5. Changesets version command produces correct changelog and bumps package versions
**Plans**: 4 plans
Plans:
- [x] 01-01-PLAN.md — Monorepo skeleton, workspace config, shared configs, .env.example
- [x] 01-02-PLAN.md — packages/shared (types, constants, errors, utils) + packages/db (Mongoose models, cached connection)
- [x] 01-03-PLAN.md — R2 storage client, presigned URL utility, Upstash rate limiter, Sentry, seed script
- [x] 01-04-PLAN.md — Docker Compose, Dockerfiles, GitHub Actions CI/CD, Changesets config

### Phase 2: Authentication
**Goal**: Users can create accounts and sign in via three providers, with sessions that survive browser refresh, unblocking all dashboard and API work
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. User can sign up and log in with a GitHub account and land on the dashboard
  2. User can sign up and log in with a Google account and land on the dashboard
  3. User can sign in via email magic link (receives email, clicks link, arrives authenticated)
  4. User who closes and reopens the browser remains logged in without re-authenticating
**Plans**: 2 plans
Plans:
- [x] 02-01-PLAN.md — Auth.js v5 backend: providers, database sessions, proxy route protection, auto-create default project
- [ ] 02-02-PLAN.md — Login page UI, protected dashboard layout, overview page, end-to-end verification

### Phase 3: Upload Flow & REST API
**Goal**: Developers can upload files end-to-end through the presigned URL pipeline (including multipart, abort, retry) and perform all file/project/key operations via authenticated REST endpoints
**Depends on**: Phase 2
**Requirements**: UPLD-01, UPLD-02, UPLD-03, UPLD-04, UPLD-05, UPLD-06, UPLD-07, UPLD-08, UPLD-09, API-01, API-02, API-03, API-04, API-05, API-06, API-07, API-08
**Success Criteria** (what must be TRUE):
  1. A curl call with a valid API key to `POST /api/v1/upload/request` returns a presigned PUT URL; uploading directly to that URL stores the file in R2
  2. A 15MB file upload completes successfully via transparent multipart chunking with progress events emitted at each chunk
  3. An in-progress upload aborted via AbortController does not create an orphaned R2 object (cleanup job confirms)
  4. `GET /api/v1/files` returns a paginated list of files; `DELETE /api/v1/files/:key` removes the file from R2 and the database
  5. `GET /api/v1/logs?since=timestamp` returns upload events for the polling interval; rate-limited endpoints return 429 with a Stripe-style error message when quota exceeded
**Plans**: 4 plans
Plans:
- [x] 01-01-PLAN.md — Monorepo skeleton, workspace config, shared configs, .env.example
- [x] 01-02-PLAN.md — packages/shared (types, constants, errors, utils) + packages/db (Mongoose models, cached connection)
- [x] 01-03-PLAN.md — R2 storage client, presigned URL utility, Upstash rate limiter, Sentry, seed script
- [ ] 01-04-PLAN.md — Docker Compose, Dockerfiles, GitHub Actions CI/CD, Changesets config

### Phase 4: SDK Core & Next.js Adapter
**Goal**: `@uploadkit/core` and `@uploadkit/next` are published-ready packages that work in both managed and BYOS modes, giving Next.js developers a typed file router pattern
**Depends on**: Phase 3
**Requirements**: SDK-01, SDK-02, SDK-03, SDK-04, SDK-05, SDK-06, NEXT-01, NEXT-02, NEXT-03, NEXT-04, NEXT-05
**Success Criteria** (what must be TRUE):
  1. `createUploadKit({ apiKey })` returns a client that can upload a file, report progress, and delete a file — verified in a unit test
  2. Switching to BYOS mode (developer-provided S3 credentials) requires zero frontend changes; all credential usage is server-side only
  3. A Next.js App Router project can define a `fileRouter`, call `createUploadKitHandler`, and receive a fully typed `AppFileRouter` type inferred on the client
  4. `pnpm build` produces tree-shakeable ESM + CJS output with zero external runtime dependencies in `@uploadkit/core`
**Plans**: 4 plans
Plans:
- [x] 01-01-PLAN.md — Monorepo skeleton, workspace config, shared configs, .env.example
- [x] 01-02-PLAN.md — packages/shared (types, constants, errors, utils) + packages/db (Mongoose models, cached connection)
- [ ] 01-03-PLAN.md — R2 storage client, presigned URL utility, Upstash rate limiter, Sentry, seed script
- [ ] 01-04-PLAN.md — Docker Compose, Dockerfiles, GitHub Actions CI/CD, Changesets config

### Phase 5: SDK React Components
**Goal**: `@uploadkit/react` delivers premium, accessible upload components that work out of the box with CSS variables theming and dark mode, matching Vercel/Supabase visual quality
**Depends on**: Phase 4
**Requirements**: REACT-01, REACT-02, REACT-03, REACT-04, REACT-05, REACT-06, REACT-07, REACT-08, REACT-09, REACT-10, REACT-11, REACT-12, REACT-13
**Success Criteria** (what must be TRUE):
  1. Wrapping an app in `<UploadKitProvider>` and rendering `<UploadButton>` produces a working upload button that cycles through idle, uploading (with percentage), success, and error states
  2. `<UploadDropzone>` accepts drag-and-drop files, shows per-file progress bars, and generates canvas thumbnail previews for images without server involvement
  3. `<UploadModal>` opens with scale+opacity animation, closes on ESC or click-outside, and has no accessibility violations (focus trap, aria-modal, reduced-motion respected)
  4. Setting `--uk-primary` CSS variable overrides the accent color across all components; `prefers-color-scheme: dark` and the explicit override both apply dark mode correctly
  5. All interactive components pass WCAG 2.1 AA contrast check and show visible `:focus-visible` rings
**Plans**: 4 plans
Plans:
- [x] 01-01-PLAN.md — Monorepo skeleton, workspace config, shared configs, .env.example
- [ ] 01-02-PLAN.md — packages/shared (types, constants, errors, utils) + packages/db (Mongoose models, cached connection)
- [ ] 01-03-PLAN.md — R2 storage client, presigned URL utility, Upstash rate limiter, Sentry, seed script
- [ ] 01-04-PLAN.md — Docker Compose, Dockerfiles, GitHub Actions CI/CD, Changesets config
**UI hint**: yes

### Phase 6: Dashboard
**Goal**: Signed-in users can manage their projects, browse and delete files, configure file routes, view upload logs (polling), check usage, and navigate via command palette — the complete SaaS management shell
**Depends on**: Phase 5
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08, DASH-09, DASH-10, DASH-11, DASH-12, DASH-13, DASH-14
**Success Criteria** (what must be TRUE):
  1. After login, the overview page shows four live metric cards (storage, bandwidth, uploads today, total files) and a 30-day upload chart drawn from real usage data
  2. User can create a project, generate an API key (displayed masked as `uk_live_xxx...xxx`), and revoke it with a confirmation dialog — all in one session
  3. The file browser DataTable shows uploaded files with preview thumbnails, supports search and filter, and bulk-deletes selected files
  4. The upload logs page auto-refreshes every 5 seconds (polling) and shows new events without a full page reload
  5. Pressing cmd+k opens the command palette; navigating with arrow keys and Enter routes to the selected page; sidebar collapses on mobile
**Plans**: 4 plans
Plans:
- [ ] 01-01-PLAN.md — Monorepo skeleton, workspace config, shared configs, .env.example
- [ ] 01-02-PLAN.md — packages/shared (types, constants, errors, utils) + packages/db (Mongoose models, cached connection)
- [ ] 01-03-PLAN.md — R2 storage client, presigned URL utility, Upstash rate limiter, Sentry, seed script
- [ ] 01-04-PLAN.md — Docker Compose, Dockerfiles, GitHub Actions CI/CD, Changesets config
**UI hint**: yes

### Phase 7: Billing & Email
**Goal**: Stripe subscription lifecycle is fully handled (checkout, upgrades, cancellations, metered overages) and transactional emails are sent for key events — monetization is live
**Depends on**: Phase 6
**Requirements**: BILL-01, BILL-02, BILL-03, BILL-04, BILL-05, BILL-06, EMAIL-01, EMAIL-02, EMAIL-03
**Success Criteria** (what must be TRUE):
  1. Clicking "Upgrade to Pro" redirects to Stripe Checkout; completing payment updates the user's subscription tier in MongoDB within 30 seconds (webhook processed)
  2. Clicking "Manage Billing" opens Stripe Billing Portal where the user can change plan or cancel, and changes are reflected in the dashboard on return
  3. A user exceeding their tier's upload limit receives a 429 response with a clear error before the upload is allowed to proceed
  4. Overage usage is reported to Stripe Meters API (not legacy UsageRecord) and appears on the next invoice
  5. New users receive a welcome email; users at 80% usage receive an alert email; failed payments trigger a payment-failed email — all via Resend
**Plans**: 4 plans
Plans:
- [ ] 01-01-PLAN.md — Monorepo skeleton, workspace config, shared configs, .env.example
- [ ] 01-02-PLAN.md — packages/shared (types, constants, errors, utils) + packages/db (Mongoose models, cached connection)
- [ ] 01-03-PLAN.md — R2 storage client, presigned URL utility, Upstash rate limiter, Sentry, seed script
- [ ] 01-04-PLAN.md — Docker Compose, Dockerfiles, GitHub Actions CI/CD, Changesets config

### Phase 8: Landing & Pricing Pages
**Goal**: The public landing page and pricing page are live, visually competitive with Vercel/Linear, fully responsive, SEO-ready, and convert visitors to signups
**Depends on**: Phase 2
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04, LAND-05, LAND-06, LAND-07, LAND-08, LAND-09, LAND-10, PRICE-01, PRICE-02, PRICE-03, PRICE-04
**Success Criteria** (what must be TRUE):
  1. Landing hero section renders an animated code snippet and "5GB free" badge; all Framer Motion entrance animations play on first load and respect `prefers-reduced-motion`
  2. The interactive code demo tab switches between Next.js, React, and API examples and shows a live component preview (UploadButton/Dropzone/Modal) with dark/light toggle
  3. The pricing page shows all four tiers with a monthly/yearly toggle that recalculates prices (20% annual discount); the overage pricing section is visible below the tier table
  4. The page scores 90+ on Lighthouse for Performance, Accessibility, and SEO on both mobile and desktop
**Plans**: 4 plans
Plans:
- [ ] 01-01-PLAN.md — Monorepo skeleton, workspace config, shared configs, .env.example
- [ ] 01-02-PLAN.md — packages/shared (types, constants, errors, utils) + packages/db (Mongoose models, cached connection)
- [ ] 01-03-PLAN.md — R2 storage client, presigned URL utility, Upstash rate limiter, Sentry, seed script
- [ ] 01-04-PLAN.md — Docker Compose, Dockerfiles, GitHub Actions CI/CD, Changesets config
**UI hint**: yes

### Phase 9: Documentation
**Goal**: The Fumadocs site has complete coverage — quickstart, per-framework getting-started guides, full SDK reference, REST API reference, and guides — so any developer can self-serve from zero to working upload in 5 minutes
**Depends on**: Phase 4
**Requirements**: DOCS-01, DOCS-02, DOCS-03, DOCS-04, DOCS-05, DOCS-06, DOCS-07, DOCS-08, DOCS-09, DOCS-10
**Success Criteria** (what must be TRUE):
  1. A developer with zero prior UploadKit knowledge can follow the Quickstart guide and have a working file upload in a Next.js App Router project in under 5 minutes
  2. The built-in Fumadocs search returns relevant results for queries like "BYOS", "fileRouter", "onUploadComplete", and "presigned URL"
  3. Every public SDK method and component prop in @uploadkit/core, @uploadkit/react, and @uploadkit/next has a corresponding reference entry with types and example
  4. The "Migration from UploadThing" guide exists and covers the key API differences
**Plans**: 4 plans
Plans:
- [ ] 01-01-PLAN.md — Monorepo skeleton, workspace config, shared configs, .env.example
- [ ] 01-02-PLAN.md — packages/shared (types, constants, errors, utils) + packages/db (Mongoose models, cached connection)
- [ ] 01-03-PLAN.md — R2 storage client, presigned URL utility, Upstash rate limiter, Sentry, seed script
- [ ] 01-04-PLAN.md — Docker Compose, Dockerfiles, GitHub Actions CI/CD, Changesets config

### Phase 10: Testing, Publishing & Launch
**Goal**: The full SDK is published to npm with correct versions and changelogs; the codebase has Vitest unit coverage on critical paths and Playwright E2E tests on the upload and auth flows; the project is launch-ready
**Depends on**: Phase 9
**Requirements**: INFRA-08, INFRA-09
**Success Criteria** (what must be TRUE):
  1. `pnpm publish` (via Changesets) publishes `@uploadkit/core`, `@uploadkit/react`, and `@uploadkit/next` to npm with correct semver and CHANGELOG.md entries
  2. Vitest unit tests cover upload flow (request, multipart, retry, abort), BYOS presigned URL generation, tier limit enforcement, and Stripe webhook handlers — all green
  3. Playwright E2E tests cover: sign up via GitHub OAuth → create project → upload a file via dashboard → verify file appears in file browser → delete file
  4. GitHub Actions CI run on main passes lint, type-check, unit tests, and build in under 5 minutes
**Plans**: 4 plans
Plans:
- [ ] 01-01-PLAN.md — Monorepo skeleton, workspace config, shared configs, .env.example
- [ ] 01-02-PLAN.md — packages/shared (types, constants, errors, utils) + packages/db (Mongoose models, cached connection)
- [ ] 01-03-PLAN.md — R2 storage client, presigned URL utility, Upstash rate limiter, Sentry, seed script
- [ ] 01-04-PLAN.md — Docker Compose, Dockerfiles, GitHub Actions CI/CD, Changesets config

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

Note: Phase 8 (Landing & Pricing) depends on Phase 2 (Auth) rather than Phase 7, so it can be worked on in parallel with Phases 6-7 if desired. Phase 9 (Docs) can begin after Phase 4 in parallel with Phases 5-7.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Monorepo & Infrastructure | 4/4 | Complete   | 2026-04-07 |
| 2. Authentication | 0/2 | Planning complete | - |
| 3. Upload Flow & REST API | 0/? | Not started | - |
| 4. SDK Core & Next.js Adapter | 0/? | Not started | - |
| 5. SDK React Components | 0/? | Not started | - |
| 6. Dashboard | 0/? | Not started | - |
| 7. Billing & Email | 0/? | Not started | - |
| 8. Landing & Pricing Pages | 0/? | Not started | - |
| 9. Documentation | 0/? | Not started | - |
| 10. Testing, Publishing & Launch | 0/? | Not started | - |
