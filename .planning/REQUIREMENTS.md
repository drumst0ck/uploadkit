# Requirements: UploadKit

**Defined:** 2026-04-07
**Core Value:** Developers can add beautiful, type-safe file uploads to any app in minutes — with a generous free tier, no vendor lock-in (BYOS), and premium components out of the box.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Monorepo & Infrastructure

- [x] **INFRA-01**: Turborepo + pnpm workspaces monorepo with apps/ and packages/ structure
- [x] **INFRA-02**: Shared configs package (ESLint, TypeScript strict, Tailwind v4)
- [x] **INFRA-03**: MongoDB Atlas connection with Mongoose ODM and cached connection pattern for serverless
- [x] **INFRA-04**: All Mongoose models implemented (User, Account, Project, ApiKey, File, FileRouter, Subscription, UsageRecord)
- [x] **INFRA-05**: Cloudflare R2 bucket configured with CORS policy (explicit AllowedHeaders), lifecycle rules, and custom CDN domain
- [x] **INFRA-06**: Upstash Redis rate limiting on all API endpoints
- [x] **INFRA-07**: Sentry error monitoring integrated across apps
- [x] **INFRA-08**: GitHub Actions CI/CD pipeline (lint, test, build, npm publish)
- [x] **INFRA-09**: Changesets for SDK versioning with automated npm publish

### Authentication

- [x] **AUTH-01**: User can sign up and log in with GitHub OAuth
- [x] **AUTH-02**: User can sign up and log in with Google OAuth
- [x] **AUTH-03**: User can sign up and log in with email magic link
- [x] **AUTH-04**: User session persists across browser refresh (Auth.js v5)

### Upload Flow

- [x] **UPLD-01**: Client can request presigned PUT URL via POST /api/v1/upload/request (validates API key, tier limits, file type/size)
- [x] **UPLD-02**: Client uploads directly to R2 via presigned URL (no server proxy)
- [x] **UPLD-03**: Client confirms upload via POST /api/v1/upload/complete (API verifies file in R2, stores metadata, executes onUploadComplete callback)
- [x] **UPLD-04**: Multipart upload for files >10MB (transparent chunking, 5MB min part size, ETag collection)
- [x] **UPLD-05**: Upload progress events (0-100%) via XHR
- [x] **UPLD-06**: Upload abort/cancel via AbortController
- [x] **UPLD-07**: Automatic retry with exponential backoff (configurable, default 3 retries)
- [x] **UPLD-08**: Client-side file type and size validation before upload request
- [x] **UPLD-09**: Cleanup job for stale "UPLOADING" records (>1 hour) to prevent orphaned R2 objects

### REST API

- [x] **API-01**: API key authentication on all v1 endpoints (Node.js runtime, not Edge)
- [x] **API-02**: Files CRUD (list paginated, get by key, update metadata, delete)
- [x] **API-03**: Projects CRUD (list, create, edit, delete)
- [x] **API-04**: API Keys management (list per project, create with uk_live_/uk_test_ prefix, revoke)
- [x] **API-05**: File Router configuration endpoints (CRUD per project)
- [x] **API-06**: Usage endpoints (current period, history)
- [x] **API-07**: Upload logs endpoint (GET /api/v1/logs?since=timestamp)
- [x] **API-08**: Descriptive error messages with codes and fix suggestions (Stripe-style)

### SDK Core (@uploadkit/core)

- [x] **SDK-01**: createUploadKit factory with API key config (managed mode)
- [x] **SDK-02**: Programmatic upload with file, route, metadata, onProgress callback
- [x] **SDK-03**: Multipart upload handling transparent to consumer
- [x] **SDK-04**: listFiles and deleteFile methods
- [x] **SDK-05**: BYOS mode — identical SDK API, server-side presigned URL generation with developer's S3/R2 credentials
- [x] **SDK-06**: Zero external dependencies, tree-shakeable ESM + CJS output via tsup

### SDK Next.js (@uploadkit/next)

- [x] **NEXT-01**: createUploadKitHandler that produces GET/POST route handlers
- [x] **NEXT-02**: File Router pattern with typed routes (allowedTypes, maxFileSize, maxFileCount, middleware, onUploadComplete)
- [x] **NEXT-03**: Middleware function receives request, returns metadata attached to upload
- [x] **NEXT-04**: End-to-end TypeScript inference from fileRouter definition to client components
- [x] **NEXT-05**: BYOS configuration — same handler, developer's S3/R2 credentials via env vars

### SDK React (@uploadkit/react)

- [x] **REACT-01**: UploadKitProvider context with API key configuration
- [x] **REACT-02**: useUploadKit headless hook (upload, progress, status, error, abort)
- [x] **REACT-03**: UploadButton with states (idle, hover, uploading with %, success, error) and variants (default, outline, ghost)
- [x] **REACT-04**: UploadDropzone with drag-and-drop, file previews, per-file progress bars, multi-file support
- [x] **REACT-05**: UploadModal with backdrop blur, scale+opacity animation, ESC/click-outside close
- [x] **REACT-06**: FileList component with uploaded files and actions
- [x] **REACT-07**: FilePreview with client-side canvas thumbnail generation (images), video poster, PDF first page, type icons
- [x] **REACT-08**: CSS custom properties theming (--uk-primary, --uk-bg, --uk-border, etc.)
- [x] **REACT-09**: Dark mode native (prefers-color-scheme + explicit override)
- [x] **REACT-10**: Customizable via className and appearance prop (Tailwind merge compatible)
- [x] **REACT-11**: Premium visual design matching Vercel/Supabase/Linear quality
- [x] **REACT-12**: generateReactHelpers<AppFileRouter>() for typed component generation
- [x] **REACT-13**: WCAG 2.1 AA accessibility (focus-visible, aria-labels, reduced-motion)

### Dashboard

- [x] **DASH-01**: Auth.js v5 login/register (GitHub, Google, magic link)
- [ ] **DASH-02**: Overview page with 4 metric cards (storage, bandwidth, uploads today, total files) + 30-day upload chart + recent files table
- [ ] **DASH-03**: Project CRUD with slug-based routing
- [ ] **DASH-04**: File browser with DataTable (preview, name, size, type, date, actions), filters, search, pagination, bulk delete
- [ ] **DASH-05**: API Keys page (masked display uk_live_xxx...xxx, copy, create, revoke with confirmation)
- [ ] **DASH-06**: File Routes configuration UI per project
- [ ] **DASH-07**: Upload logs page with polling (5s interval), filter by date/status/route
- [ ] **DASH-08**: Usage page with progress bars (% of tier limit), historical chart, breakdown by project
- [ ] **DASH-09**: Billing page (current plan card, upgrade button, Stripe Billing Portal link, invoice history)
- [ ] **DASH-10**: Settings page (profile, notifications, delete account)
- [ ] **DASH-11**: Command palette (cmd+k) for navigation
- [x] **DASH-12**: Sidebar layout (collapsible), header with breadcrumbs/search/avatar
- [x] **DASH-13**: Dark mode by default with toggle, responsive design
- [x] **DASH-14**: Vercel/Linear/Supabase-inspired visual design with shadcn/ui

### Landing Page

- [ ] **LAND-01**: Hero section with headline, subheadline, CTAs, animated code snippet, "5GB free" badge
- [ ] **LAND-02**: Interactive code demo with tabs (Next.js, React, API) and live component preview
- [ ] **LAND-03**: Features grid (3x2) — managed storage, BYOS, components, type-safety, direct uploads, dashboard
- [ ] **LAND-04**: Competitor comparison table (subtle, "Others" not named)
- [ ] **LAND-05**: Component showcase with interactive demos (UploadButton, UploadDropzone, UploadModal) + dark/light toggle
- [ ] **LAND-06**: Pricing preview (3 cards: Free/Pro/Team) with CTA to /pricing
- [ ] **LAND-07**: Footer with links (Docs, GitHub, Twitter, Discord, Status)
- [ ] **LAND-08**: Motion animations (entrance stagger, hover effects, scroll-triggered)
- [ ] **LAND-09**: Responsive (375px, 768px, 1024px, 1440px) + dark mode
- [ ] **LAND-10**: SEO (metadata, OG images, structured data)

### Pricing Page

- [ ] **PRICE-01**: Pricing table with monthly/yearly toggle (20% annual discount)
- [ ] **PRICE-02**: Four tiers: Free, Pro ($15/mo), Team ($35/mo), Enterprise (contact)
- [ ] **PRICE-03**: Feature comparison matrix with all tier differences
- [ ] **PRICE-04**: Overage pricing section ($0.02/GB storage, $0.01/GB BW, $0.001/upload)

### Documentation

- [ ] **DOCS-01**: Fumadocs site with MDX, built-in search, modern design
- [ ] **DOCS-02**: Quickstart guide (5-minute setup: install, file router, provider, component)
- [ ] **DOCS-03**: Getting started guides per framework (Next.js App Router, React/Vite, API-only)
- [ ] **DOCS-04**: Core concepts (file routes, presigned URLs, BYOS, security)
- [ ] **DOCS-05**: SDK reference — @uploadkit/core (config, upload, delete, API reference)
- [ ] **DOCS-06**: SDK reference — @uploadkit/react (all components, hook, theming, API reference)
- [ ] **DOCS-07**: SDK reference — @uploadkit/next (handler, file router, middleware, type safety)
- [ ] **DOCS-08**: API reference (REST endpoints, auth, errors, webhooks)
- [ ] **DOCS-09**: Guides (image upload, avatar upload, document upload, multipart, custom styling, migration from UploadThing)
- [ ] **DOCS-10**: Dashboard documentation (overview, projects, files, API keys, billing)

### Billing & Payments

- [ ] **BILL-01**: Stripe Checkout for Pro/Team subscription creation
- [ ] **BILL-02**: Stripe Billing Portal for plan management (upgrade, downgrade, cancel)
- [ ] **BILL-03**: Stripe webhook handling (checkout.session.completed, subscription.updated/deleted, invoice.paid/failed)
- [ ] **BILL-04**: Metered overage billing via Stripe Meters API (storage, bandwidth, uploads)
- [ ] **BILL-05**: Usage tracking with MongoDB atomic $inc counters per user per period
- [ ] **BILL-06**: Tier limit enforcement (check before presigned URL generation)

### Email

- [ ] **EMAIL-01**: Welcome email on signup (Resend + React Email)
- [ ] **EMAIL-02**: Usage alert emails at 80% and 100% of tier limits
- [ ] **EMAIL-03**: Invoice/payment emails (paid, failed)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Image Processing

- **IMG-01**: Server-side image transformation via Cloudflare Images (resize, crop, format)
- **IMG-02**: On-the-fly URL-based transformations (width, height, quality params)

### Real-time

- **RT-01**: Upload logs via Server-Sent Events (SSE) for real-time streaming
- **RT-02**: WebSocket notifications for upload completion

### Advanced Features

- **ADV-01**: Custom CDN domains per project (CNAME to Cloudflare)
- **ADV-02**: Video transcoding via Cloudflare Stream integration
- **ADV-03**: URL upload (upload from external URL)
- **ADV-04**: Blog and changelog pages on landing site
- **ADV-05**: Team member management with roles
- **ADV-06**: Automatic malware/virus scanning (enterprise)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Server-side image/video processing | Cloudinary's entire moat — defer to v2 with Cloudflare Images |
| Real-time WebSocket/SSE for logs | 5s polling sufficient for MVP; SSE adds infra complexity |
| Native mobile SDKs (iOS/Android) | REST API works from any client; React Native uses @uploadkit/react |
| Social source imports (Drive, Dropbox) | OAuth complexity per source; URL upload in v2 covers 80% case |
| Folder upload with directory structure | S3 is flat; synthetic paths add UX debt |
| Per-project custom CDN domains | Requires Cloudflare custom hostname provisioning; v2 Pro/Team |
| Collaborative file annotations | Outside FUaaS scope entirely |
| SOC 2 compliance | Enterprise v2+ |
| OAuth beyond GitHub/Google | Email magic link covers the rest for v1 |
| Pages Router support | App Router only for v1; Pages Router in v2 if demanded |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 1 | Complete |
| INFRA-05 | Phase 1 | Complete |
| INFRA-06 | Phase 1 | Complete |
| INFRA-07 | Phase 1 | Complete |
| INFRA-08 | Phase 10 | Complete |
| INFRA-09 | Phase 10 | Complete |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Complete |
| AUTH-04 | Phase 2 | Complete |
| UPLD-01 | Phase 3 | Complete |
| UPLD-02 | Phase 3 | Complete |
| UPLD-03 | Phase 3 | Complete |
| UPLD-04 | Phase 3 | Complete |
| UPLD-05 | Phase 3 | Complete |
| UPLD-06 | Phase 3 | Complete |
| UPLD-07 | Phase 3 | Complete |
| UPLD-08 | Phase 3 | Complete |
| UPLD-09 | Phase 3 | Complete |
| API-01 | Phase 3 | Complete |
| API-02 | Phase 3 | Complete |
| API-03 | Phase 3 | Complete |
| API-04 | Phase 3 | Complete |
| API-05 | Phase 3 | Complete |
| API-06 | Phase 3 | Complete |
| API-07 | Phase 3 | Complete |
| API-08 | Phase 3 | Complete |
| SDK-01 | Phase 4 | Complete |
| SDK-02 | Phase 4 | Complete |
| SDK-03 | Phase 4 | Complete |
| SDK-04 | Phase 4 | Complete |
| SDK-05 | Phase 4 | Complete |
| SDK-06 | Phase 4 | Complete |
| NEXT-01 | Phase 4 | Complete |
| NEXT-02 | Phase 4 | Complete |
| NEXT-03 | Phase 4 | Complete |
| NEXT-04 | Phase 4 | Complete |
| NEXT-05 | Phase 4 | Complete |
| REACT-01 | Phase 5 | Complete |
| REACT-02 | Phase 5 | Complete |
| REACT-03 | Phase 5 | Complete |
| REACT-04 | Phase 5 | Complete |
| REACT-05 | Phase 5 | Complete |
| REACT-06 | Phase 5 | Complete |
| REACT-07 | Phase 5 | Complete |
| REACT-08 | Phase 5 | Complete |
| REACT-09 | Phase 5 | Complete |
| REACT-10 | Phase 5 | Complete |
| REACT-11 | Phase 5 | Complete |
| REACT-12 | Phase 5 | Complete |
| REACT-13 | Phase 5 | Complete |
| DASH-01 | Phase 6 | Complete |
| DASH-02 | Phase 6 | Pending |
| DASH-03 | Phase 6 | Pending |
| DASH-04 | Phase 6 | Pending |
| DASH-05 | Phase 6 | Pending |
| DASH-06 | Phase 6 | Pending |
| DASH-07 | Phase 6 | Pending |
| DASH-08 | Phase 6 | Pending |
| DASH-09 | Phase 6 | Pending |
| DASH-10 | Phase 6 | Pending |
| DASH-11 | Phase 6 | Pending |
| DASH-12 | Phase 6 | Complete |
| DASH-13 | Phase 6 | Complete |
| DASH-14 | Phase 6 | Complete |
| BILL-01 | Phase 7 | Pending |
| BILL-02 | Phase 7 | Pending |
| BILL-03 | Phase 7 | Pending |
| BILL-04 | Phase 7 | Pending |
| BILL-05 | Phase 7 | Pending |
| BILL-06 | Phase 7 | Pending |
| EMAIL-01 | Phase 7 | Pending |
| EMAIL-02 | Phase 7 | Pending |
| EMAIL-03 | Phase 7 | Pending |
| LAND-01 | Phase 8 | Pending |
| LAND-02 | Phase 8 | Pending |
| LAND-03 | Phase 8 | Pending |
| LAND-04 | Phase 8 | Pending |
| LAND-05 | Phase 8 | Pending |
| LAND-06 | Phase 8 | Pending |
| LAND-07 | Phase 8 | Pending |
| LAND-08 | Phase 8 | Pending |
| LAND-09 | Phase 8 | Pending |
| LAND-10 | Phase 8 | Pending |
| PRICE-01 | Phase 8 | Pending |
| PRICE-02 | Phase 8 | Pending |
| PRICE-03 | Phase 8 | Pending |
| PRICE-04 | Phase 8 | Pending |
| DOCS-01 | Phase 9 | Pending |
| DOCS-02 | Phase 9 | Pending |
| DOCS-03 | Phase 9 | Pending |
| DOCS-04 | Phase 9 | Pending |
| DOCS-05 | Phase 9 | Pending |
| DOCS-06 | Phase 9 | Pending |
| DOCS-07 | Phase 9 | Pending |
| DOCS-08 | Phase 9 | Pending |
| DOCS-09 | Phase 9 | Pending |
| DOCS-10 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 101 total
- Mapped to phases: 101
- Unmapped: 0

Note: The file previously stated 82 total requirements. Actual count from enumerated IDs is 101.

---
*Requirements defined: 2026-04-07*
*Last updated: 2026-04-07 after roadmap creation — traceability populated*
