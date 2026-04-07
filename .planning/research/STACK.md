# Stack Research

**Domain:** File Uploads as a Service (FUaaS) — SaaS platform + open-source SDK
**Researched:** 2026-04-07
**Confidence:** HIGH (all critical choices verified against official docs/releases)

---

## Recommended Stack

### Monorepo Tooling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Turborepo | 2.9.4 | Task orchestration, remote caching | De facto standard for JS/TS monorepos. Rust-powered, Vercel-backed, 96% faster time-to-first-task in 2.9. Zero config for most setups. `turbo query` (GraphQL over repo graph) is now stable. |
| pnpm | 9.x (latest) | Package manager + workspaces | Fastest installs, strict hoisting prevents phantom deps, native workspace protocol, best compatibility with Turborepo. Required for correct `catalog:` version pinning. |
| Changesets | ^3 (latest) | SDK versioning + changelog generation | Standard for multi-package repos publishing to npm. Decouples intent (patch/minor/major) from publish. Integrates with GitHub Actions for automated PR-based release flow. |

### Core Framework (Apps)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2.x (latest) | App framework for web, dashboard, docs, api | Next.js 16 ships Turbopack stable as default bundler (5-10x faster dev, 2-5x faster builds). React Compiler 1.0 integration is stable — zero-config memoization. cacheLife/cacheTag APIs are stable (no more `unstable_` prefix). Use App Router exclusively — Pages Router is maintenance-only. |
| React | 19.2.4 | UI rendering | Fully stable as of 2026. Server Components stable. Required for Next.js 16. Actions, useOptimistic, use() are production-ready. |
| TypeScript | 5.x (latest) | Type safety | Strict mode required. `exactOptionalPropertyTypes: true`. SDK packages must export clean `.d.ts` types — no `any`. |

### Styling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Tailwind CSS | 4.2.2 (latest) | Utility-first CSS | v4 drops `tailwind.config.js` for CSS-first config via `@theme`. Engine is 5x faster full builds, 100x faster incremental. Native CSS cascade layers, P3 color support. Use in dashboard and landing. |
| CSS Custom Properties | native | SDK component theming | The only correct approach for `@uploadkit/react` components — consumers must be able to override vars (`--uk-accent`, `--uk-radius`) without fighting Tailwind's specificity. No Tailwind in the SDK packages. |
| Motion (formerly Framer Motion) | 12.27.x (latest) | Animations in landing/dashboard | Package renamed from `framer-motion` to `motion`, import from `motion/react`. v12 adds oklch/oklab color animation, hardware-accelerated scroll, layout animations. No breaking changes from Framer Motion. |

### Database

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| MongoDB Atlas | M10+ | Primary database | Project constraint. Managed service with global clusters, automatic backups. Serverless tier available but M10 dedicated gives predictable latency for API-heavy workload. |
| Mongoose | 8.x (latest) | ODM for MongoDB | Project constraint. Provides schema validation, middleware hooks (pre-save, post-find), population. Critical: must use cached connection pattern for serverless — store connection promise on `global` between invocations. Never use Mongoose in Edge Runtime (no `net`/`tls` modules). |

### Authentication

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Auth.js (NextAuth) | v5 (beta, production-stable) | Session auth for dashboard | Single `auth()` export, no separate `authOptions` object. Native App Router support via middleware. Supports GitHub + Google OAuth + Email magic link (Resend adapter). Despite "beta" label, production-stable and widely deployed on Next.js 16. |
| API Key auth (custom) | — | SDK/API authentication | Auth.js is for dashboard sessions only. REST API and SDK calls authenticate via `uk_live_*` / `uk_test_*` API keys — looked up from MongoDB, hashed with bcrypt, compared in middleware. Never use session cookies for programmatic API access. |

### Storage

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Cloudflare R2 | — | Managed object storage | Zero egress fees (critical for FUaaS economics). Global CDN via Cloudflare network. S3-compatible API — use AWS SDK v3, no custom client needed. |
| @aws-sdk/client-s3 | 3.x (latest ~3.1023) | R2 client | AWS SDK v3 is modular, tree-shakeable, ESM-native. R2 is fully S3-compatible. Set endpoint to `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. |
| @aws-sdk/s3-request-presigner | 3.x (latest ~3.1023) | Presigned PUT URL generation | Standard for presigned URL flow. `getSignedUrl(client, new PutObjectCommand(...), { expiresIn: 3600 })`. Must specify `ContentType` in params — signature includes it, mismatch causes 403. |

### Payments

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Stripe | latest (API 2026-04-01) | Subscriptions, Checkout, Billing Portal, metered overage | Breaking change in 2026: `new Stripe()` instead of calling as function. As of API `2025-03-31.basil`, legacy usage records are gone — all metered billing requires a backing `Meter` object. Must use `Meter` + `MeterEvent` API for overage billing. Webhook signature verification required for all events. |

### Email

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Resend | latest | Transactional email delivery | Built by same team as React Email. TypeScript SDK, excellent deliverability, developer-first. Supports Auth.js email adapter for magic links. |
| React Email | latest | Email template authoring | Write emails as React components — renders to cross-client HTML. Eliminates hand-written email HTML. Co-designed with Resend. |

### Rate Limiting & Caching

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Upstash Redis | — | Rate limiting backend | HTTP-based (connectionless) — works in serverless and Edge. No persistent connections needed. |
| @upstash/ratelimit | 2.0.8 (latest) | Rate limiting SDK | Supports fixed window, sliding window, token bucket. Caches locally while Edge function is "hot" to minimize Redis round-trips. Use sliding window for upload API endpoints. |

### SDK Bundling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| tsup | 8.5.0 (latest) | Bundle `@uploadkit/core`, `@uploadkit/react`, `@uploadkit/next` | Built on esbuild. Zero-config dual ESM+CJS output with `.d.ts` declarations in one command. Tree-shaking works on ESM output. CJS output is not tree-shakeable — acceptable since most bundlers use ESM. The 2026 default for TypeScript library publishing. |

### Monitoring & Observability

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Sentry | latest `@sentry/nextjs` | Error tracking + performance | Wizard (`npx @sentry/wizard -i nextjs`) auto-instruments App Router, Server Actions, API routes, Edge middleware. Creates `global-error.tsx` for React render errors. Single SDK covers browser + server + edge. |

### Documentation

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Fumadocs | latest | Docs site (`/apps/docs`) | Native Next.js MDX framework. Powers v0 by Vercel. Architecture: Content (MDX source) → Core (routing) → UI (components). Built-in search, syntax highlighting, OpenAPI support. Ships as a Next.js app — sits naturally in the monorepo. |

### Testing

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vitest | 4.x (latest) | Unit + integration tests | 3-5x faster than Jest. Native ESM. Smart watch mode reruns only affected tests. v4 ships browser-native mode via Playwright integration. Use for SDK unit tests and API route tests. |
| Playwright | latest | E2E tests | Best-in-class browser automation. Dashboard E2E, upload flow smoke tests. Vitest 4 can run Playwright in browser mode — shared toolchain. |

### CI/CD

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| GitHub Actions | — | CI pipeline | Lint → test → build → publish. Changesets action creates release PR on merge to main, then publishes to npm on merge of release PR. Turborepo remote caching on CI cuts build times dramatically. |

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | latest (3.x) | Schema validation | API request body validation, file router config schema, environment variable parsing (`zod.parse(process.env)`). Use everywhere you accept external input. |
| jose | latest | JWT signing/verification | API key JWT verification if needed; also used internally by Auth.js. Do not use `jsonwebtoken` (Node.js-only, no Edge support). |
| bcryptjs | latest | API key hashing | Hash stored API keys. Use `bcryptjs` (pure JS) not `bcrypt` (native bindings fail in serverless). |
| nanoid | latest | ID generation | Short unique IDs for file keys, API keys. Smaller than `uuid`, URL-safe, no crypto dependency issues. |
| clsx + cva | latest | Conditional classnames | Dashboard and `@uploadkit/react` component variants. `cva` for typed variant definitions, `clsx` for merging. |
| nuqs | latest | URL state management | Dashboard query params (active project, pagination, filters) — type-safe, SSR-compatible, works with App Router. Replaces manual `useSearchParams` wrangling. |
| sharp | 0.33.x | Server-side image metadata | Extract dimensions/format from uploads server-side without full processing. Optional — v1 does client-side thumbnails via canvas in `FilePreview`. |
| date-fns | latest | Date formatting | Format upload timestamps, usage period dates. Tree-shakeable, no moment.js. |
| recharts | latest | Usage charts in dashboard | React-native charting, works with Tailwind, sufficient for storage/bandwidth/upload count charts. |

---

## Installation

```bash
# Monorepo root
pnpm add -D turbo typescript @changesets/cli

# Next.js app (dashboard / web / docs / api)
pnpm add next@latest react@latest react-dom@latest
pnpm add -D @types/react @types/react-dom

# Tailwind CSS v4
pnpm add tailwindcss@latest @tailwindcss/postcss

# Auth.js v5
pnpm add next-auth@beta

# Database
pnpm add mongoose

# Storage (R2 via AWS SDK v3)
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Payments
pnpm add stripe

# Email
pnpm add resend react-email @react-email/components

# Rate limiting
pnpm add @upstash/ratelimit @upstash/redis

# Monitoring
pnpm add @sentry/nextjs

# Validation & utilities
pnpm add zod jose bcryptjs nanoid clsx cva nuqs

# Animation (landing/dashboard)
pnpm add motion

# Charts
pnpm add recharts

# SDK bundler (in SDK packages)
pnpm add -D tsup

# Testing
pnpm add -D vitest @vitest/coverage-v8 playwright @playwright/test

# Docs
pnpm add fumadocs-ui fumadocs-mdx fumadocs-core
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Next.js 16 (App Router) | Remix / Hono + Vite | Next.js 16 with Turbopack is the most cohesive stack for Vercel deploy. Fumadocs is Next.js-native. App Router Server Components remove the need for a separate API layer for dashboard data. |
| MongoDB + Mongoose | PostgreSQL + Prisma | Explicit project constraint. MongoDB's flexible schema suits File and FileRouter documents that evolve. Mongoose v8 has good TypeScript inference. |
| Auth.js v5 | Clerk / Lucia | Auth.js is open-source and self-hosted. Clerk has per-MAU pricing that conflicts with a free tier product. Lucia is no longer maintained (archived 2024). |
| tsup | Rollup / Vite Library Mode | tsup wraps esbuild — faster than Rollup, simpler config than Vite library mode. Dual ESM+CJS with `.d.ts` in one config file. |
| Upstash Redis | Vercel KV / Cloudflare Durable Objects | Upstash is HTTP-native (works in Edge), generous free tier, `@upstash/ratelimit` is purpose-built for this use case. |
| Fumadocs | Nextra / Docusaurus | Fumadocs is built on Next.js — shares the monorepo's framework, tooling, and Tailwind config. Nextra is older and less maintained. Docusaurus is React but not Next.js (breaks monorepo consistency). |
| Changesets | semantic-release | Changesets requires explicit human intent per change (patch/minor/major in markdown files). semantic-release infers from commit messages — error-prone for an SDK where accidental breaking changes must be caught. |
| Motion (motion/react) | React Spring / GSAP | Motion is the clear 2026 winner for React animations. GSAP requires license for commercial use in some configurations. React Spring is unmaintained relative to Motion's cadence. |
| Vitest | Jest | No reason to use Jest for new projects in 2026. Vitest is 3-5x faster, native ESM, same API surface. |
| Resend + React Email | SendGrid / Postmark + Handlebars | Resend is built by the React Email team — first-class integration. React Email components are type-safe and maintainable. Handlebars templates are brittle. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `jsonwebtoken` | Node.js-only, breaks in Edge Runtime and Cloudflare Workers | `jose` (Web Crypto API, works everywhere) |
| `bcrypt` (native) | Native bindings fail in serverless/edge environments | `bcryptjs` (pure JS, same API) |
| `multer` / `busboy` for file handling | Server-proxied uploads kill scalability — server becomes bottleneck for every byte | Presigned URL flow: client uploads directly to R2, server only generates URL and records metadata |
| Pages Router | Maintenance-only in Next.js 16. App Router is the present and future | App Router exclusively |
| `next-auth@4` (NextAuth v4) | v4 has no App Router support, no Edge middleware support, requires `authOptions` object antipattern | `next-auth@beta` (Auth.js v5) |
| `framer-motion` package name | Renamed to `motion`. Old package still works but won't receive updates | `motion` package, import from `motion/react` |
| Tailwind CSS v3 | v4 has breaking config changes (no `tailwind.config.js`). Installing v3 alongside v4 causes conflicts | `tailwindcss@latest` (v4.2.x) |
| Prisma | Explicit project constraint to use Mongoose. Prisma also has edge runtime limitations with MongoDB | Mongoose 8.x |
| `uuid` | 34 bytes vs nanoid's 21 bytes. Nanoid is smaller and URL-safe by default | `nanoid` |
| Lerna | Obsolete. Turborepo + Changesets covers everything Lerna did, better and faster | Turborepo + pnpm workspaces + Changesets |
| Legacy Stripe usage records API | Removed in API `2025-03-31.basil`. Will throw errors if used | `Meter` + `MeterEvent` objects for all metered billing |

---

## Stack Patterns by Variant

**For `@uploadkit/core` (framework-agnostic SDK):**
- No React, no Next.js imports
- Pure TypeScript, built with tsup
- Exports: ESM primary, CJS secondary
- Zero runtime dependencies (zod for internal validation only, marked as peer dep or bundled)
- Target: Node.js 18+, browser (Web Crypto API), Edge Runtime

**For `@uploadkit/react` (React SDK):**
- React 18+ peer dependency (supports both 18 and 19)
- CSS Custom Properties for theming — never inline Tailwind classes
- Each component is a named export — enables tree-shaking via ESM
- No default exports in the SDK packages (named exports only for better DX)

**For `@uploadkit/next` (Next.js integration):**
- Next.js 14+ peer dependency
- `createUploadKitHandler` returns a Route Handler compatible with App Router
- Server-only code in `server` subpath export — never import in client components
- Use `"server-only"` package in server utilities to enforce boundary

**For the API app (REST API):**
- Next.js Route Handlers (not a separate Express server)
- Mongoose runs in Route Handlers only — never in Edge middleware
- Edge middleware only for: auth header extraction, rate limit check (Upstash HTTP)
- All DB operations in Node.js runtime Route Handlers

**For BYOS (Bring Your Own Storage):**
- User-provided S3/R2 credentials stored encrypted in MongoDB (`ApiKey` model)
- Never passed to browser — presigned URL generation always server-side
- SDK interface identical to managed mode — zero consumer API changes

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| next@16.x | react@19.x | Next.js 16 requires React 19. If supporting React 18 consumers in SDK, that's separate from the apps. |
| next-auth@beta (v5) | next@14+ | v5 supports Next.js 14, 15, 16. Must be beta channel — not `@latest`. |
| tailwindcss@4.x | postcss@8.x | v4 requires PostCSS plugin `@tailwindcss/postcss`. No `tailwind.config.js` — config lives in CSS. |
| mongoose@8.x | Node.js 18+ | Mongoose 8 dropped Node 16 support. Never run in Edge Runtime. |
| @aws-sdk/client-s3@3.x | Node.js 18+ | AWS SDK v3 requires Node.js 18+. Works in Lambda/Vercel serverless functions. |
| motion@12.x | react@18+ | Supports React 18 and 19. Import from `motion/react`, not `framer-motion`. |
| @sentry/nextjs | next@14+ | Wizard auto-detects App Router vs Pages Router. Run wizard after Next.js is installed. |
| tsup@8.x | TypeScript 5.x | Requires TypeScript 5 for `moduleResolution: bundler` support. |
| vitest@4.x | Node.js 20+ | Vitest 4 requires Node.js 20+. Project uses Node.js 22 LTS — compatible. |

---

## Sources

- [Turborepo releases](https://github.com/vercel/turborepo/releases) — version 2.9.4 confirmed
- [Next.js 16 blog](https://nextjs.org/blog/next-16) — Turbopack stable, React Compiler stable
- [Tailwind CSS v4.0 blog](https://tailwindcss.com/blog/tailwindcss-v4) — v4.2.2 confirmed stable
- [Auth.js v5 migration guide](https://authjs.dev/getting-started/migrating-to-v5) — App Router support confirmed
- [Cloudflare R2 presigned URLs docs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) — AWS SDK v3 pattern confirmed
- [Stripe changelog](https://docs.stripe.com/changelog) — `new Stripe()` breaking change, Meter API
- [@upstash/ratelimit npm](https://www.npmjs.com/package/@upstash/ratelimit) — version 2.0.8 confirmed
- [Resend Node.js SDK](https://github.com/resend/resend-node) — React Email integration confirmed
- [Fumadocs](https://www.fumadocs.dev/) — Next.js native, powers v0 by Vercel
- [tsup](https://github.com/egoist/tsup) — version 8.5.0 confirmed current standard
- [Vitest 3.2 blog](https://vitest.dev/blog/vitest-3-2.html) — v4.x confirmed current
- [Motion changelog](https://motion.dev/changelog) — v12.27.x, renamed from framer-motion
- [Changesets CLI npm](https://www.npmjs.com/package/@changesets/cli) — standard for SDK monorepos
- [@aws-sdk/s3-request-presigner npm](https://www.npmjs.com/package/@aws-sdk/s3-request-presigner) — v3.1023.x confirmed

---
*Stack research for: UploadKit — File Uploads as a Service platform*
*Researched: 2026-04-07*
