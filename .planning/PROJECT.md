# UploadKit

## What This Is

UploadKit (uploadkit.dev) is a File Uploads as a Service (FUaaS) platform for developers — a direct competitor to UploadThing. It provides managed file storage powered by Cloudflare R2 with a global CDN, an open-source TypeScript SDK with premium React components, a SaaS dashboard for managing projects/files/billing, and a BYOS (Bring Your Own Storage) mode that lets developers use their own S3/R2 buckets with zero frontend changes.

## Core Value

Developers can add beautiful, type-safe file uploads to any app in minutes — with a generous free tier, no vendor lock-in (BYOS), and components that look premium out of the box.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Monorepo setup with Turborepo + pnpm workspaces
- [ ] Shared configs (ESLint, TypeScript strict, Tailwind v4)
- [ ] MongoDB Atlas with Mongoose ODM (cached connection pattern)
- [ ] Auth.js v5 with GitHub + Google + Email magic link
- [ ] Cloudflare R2 storage with presigned URL upload flow
- [ ] CDN via Cloudflare custom domain (cdn.uploadkit.dev)
- [ ] `@uploadkit/core` — upload, multipart (>10MB), progress, retry, abort, client-side validation
- [ ] `@uploadkit/core` — BYOS mode (server-side only, never expose credentials to browser)
- [ ] `@uploadkit/next` — createUploadKitHandler, fileRouter pattern, end-to-end TypeScript
- [ ] `@uploadkit/react` — UploadButton, UploadDropzone, UploadModal, FileList, FilePreview, useUploadKit hook
- [ ] `@uploadkit/react` — premium design (Apple/Vercel/Supabase quality), dark mode, CSS variables theming
- [ ] `@uploadkit/react` — client-side thumbnail generation (canvas) in FilePreview
- [ ] Dashboard — auth, overview metrics, project CRUD, file browser, API keys, file routes config
- [ ] Dashboard — usage page with charts, billing with Stripe integration, settings
- [ ] Dashboard — upload logs via polling (GET /api/v1/logs?since=timestamp, 5s interval)
- [ ] Dashboard — command palette (cmd+k), responsive, dark mode default
- [ ] Landing page — hero, code demo, features grid, competitor comparison, component showcase, pricing preview
- [ ] Landing page — animations (Framer Motion), responsive, dark mode, SEO
- [ ] Pricing page — Free/Pro($15)/Team($35)/Enterprise with monthly/yearly toggle
- [ ] Docs site — Fumadocs with MDX, quickstart, SDK reference, API reference, guides
- [ ] Stripe payments — Checkout, Billing Portal, webhooks, metered overage billing
- [ ] Transactional emails via Resend (welcome, usage alerts, invoice)
- [ ] REST API — upload flow, files CRUD, projects CRUD, API keys, usage, billing endpoints
- [ ] API keys prefixed with `uk_live_` and `uk_test_`
- [ ] Rate limiting with Upstash Redis
- [ ] Error monitoring with Sentry
- [ ] Testing — Vitest for unit, Playwright for E2E
- [ ] SDK published on npm as `@uploadkit/core`, `@uploadkit/react`, `@uploadkit/next`
- [ ] CI/CD with GitHub Actions (lint, test, build, publish)
- [ ] Conventional commits + Changesets for SDK versioning

### Out of Scope

- Server-side image processing/transformation — v2 feature (Cloudflare Images)
- Real-time upload logs via WebSocket/SSE — v2, polling is sufficient for MVP
- BYOS client-side credential exposure — BYOS always goes through server-side handler
- Real-time chat/notifications via WebSocket — unnecessary complexity for v1
- Mobile native SDKs — web-first
- OAuth beyond GitHub/Google — email magic link covers the rest
- Blog/changelog pages — v2
- SOC 2 compliance — Enterprise v2+
- Custom domain CDN per-project — Pro/Team feature, v2 implementation

## Context

**Market position:** Direct UploadThing competitor with key differentiators: BYOS support (no vendor lock-in), more generous free tier (5GB storage, 10GB bandwidth), open-source SDK, premium component design.

**Technical environment:**
- Monorepo: Turborepo + pnpm workspaces
- Apps: web (landing), dashboard, docs, api
- Packages: core, react, next, shared, ui, db, config
- Runtime: Node.js 22 LTS
- Deploy target: Vercel (primary) or Coolify/Docker (self-hosted)

**Upload architecture:** Presigned URL flow — client requests URL from API, API validates (API key, tier limits, file type/size), generates presigned PUT URL for R2, client uploads directly to R2 (no server bottleneck), client confirms completion, API verifies and stores metadata. BYOS uses identical flow but with developer's own S3/R2 credentials configured server-side.

**Database models defined:** User, Account, Project, ApiKey, File (with status lifecycle), FileRouter, Subscription (tiers: FREE/PRO/TEAM/ENTERPRISE), UsageRecord (monthly periods).

**Pricing tiers:** Free (5GB/10GB BW/1K uploads), Pro $15/mo (50GB/100GB BW/10K), Team $35/mo (200GB/500GB BW/50K), Enterprise (custom). Overage: $0.02/GB storage, $0.01/GB bandwidth, $0.001/upload.

**Design standards:** Premium component quality matching Vercel/Supabase/Linear. TypeScript strict, zero `any`. WCAG 2.1 AA accessibility. Tree-shakeable SDK. Descriptive error messages (Stripe-style).

## Constraints

- **Stack**: Must use MongoDB/Mongoose (not Prisma), Cloudflare R2 (S3-compatible), Auth.js v5, Stripe — as specified in the GSD document
- **Versions**: Always install latest stable versions (`pnpm add package@latest`), never pin old versions
- **SDK design**: Components must be tree-shakeable, support dark mode natively, use CSS custom properties for theming
- **Security**: BYOS credentials never exposed to browser — always server-side presigned URL generation
- **Naming**: API keys prefixed `uk_live_` / `uk_test_`
- **Performance**: Lazy loading in dashboard, direct-to-storage uploads (no server proxy)
- **Accessibility**: WCAG 2.1 AA on all interactive components

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| No server-side image processing in v1 | Reduces complexity; client-side thumbnails via canvas sufficient for MVP | — Pending |
| Upload logs via polling, not SSE/WS | SSE/WebSocket adds unnecessary complexity for MVP; 5s polling sufficient | — Pending |
| BYOS always server-side | Never expose S3 credentials to browser; SDK works identically in both modes | — Pending |
| MongoDB + Mongoose over Prisma | Explicit project requirement; cached connection pattern for serverless | — Pending |
| Fumadocs for documentation | Native Next.js MDX docs framework; modern design, built-in search | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-07 after initialization*
