# Phase 1: Monorepo & Infrastructure - Research

**Researched:** 2026-04-07
**Domain:** Turborepo + pnpm monorepo, Mongoose/MongoDB, Cloudflare R2, Docker, GitHub Actions, Changesets
**Confidence:** HIGH (all critical stack choices verified against npm registry and project research artifacts)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** MongoDB runs locally via Docker Compose (not Atlas-only). Developers use `docker compose up` to get a local MongoDB instance.
- **D-02:** Single `.env` file at the repo root. All apps read from it. No per-app `.env.local` files — one source of truth.
- **D-03:** Include a basic seed script that creates a test user, project, API key, and sample files. This runs as `pnpm seed` from the root.
- **D-04:** `packages/shared` contains TypeScript types/interfaces, utility functions (formatBytes, generateId, etc.), and shared constants (TIERS, FILE_STATUSES, etc.).
- **D-05:** `packages/ui` is the shadcn/ui base — primitives only (Button, Input, Dialog, etc.). Dashboard imports and composes them into higher-level components (DataTable, MetricCard) within its own codebase.
- **D-06:** `packages/config` holds all three shared configs: ESLint, TypeScript, and Tailwind v4. Each app extends from these.
- **D-07:** Separate R2 buckets per environment: `uploadkit-dev` and `uploadkit-prod`. No shared buckets.
- **D-08:** CDN domain: `cdn.uploadkit.dev` pointing to the prod R2 bucket only. Dev uses R2 direct URLs (no CDN domain for dev).
- **D-09:** R2 key path structure confirmed: `{projectId}/{fileRouterId}/{uuid}/{filename}` (e.g., `proj_abc123/imageUploader/550e8400-e29b/photo.jpg`).
- **D-10:** Deploy target is Coolify/Docker (self-hosted), not Vercel. All apps deploy as Docker containers.
- **D-11:** Unified deployment — single docker-compose/Coolify config that deploys all apps together.
- **D-12:** Domain structure uses subdomains: `uploadkit.dev` (landing), `app.uploadkit.dev` (dashboard), `docs.uploadkit.dev` (docs).
- **D-13:** Phase 1 includes multi-stage Dockerfiles for each app + a docker-compose.yml for both local development and production deployment.

### Claude's Discretion

- Turborepo pipeline configuration (build order, cache strategy)
- pnpm workspace protocol setup
- ESLint rule selection within the shared config
- Sentry project/DSN configuration specifics
- GitHub Actions workflow structure
- Upstash Redis connection setup pattern

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Turborepo + pnpm workspaces monorepo with apps/ and packages/ structure | Turborepo 2.9.5 verified; pnpm 10.x available; workspace protocol and turbo.json patterns documented below |
| INFRA-02 | Shared configs package (ESLint, TypeScript strict, Tailwind v4) | packages/config structure with three sub-configs; Tailwind v4 CSS-first config pattern; TypeScript strict preset documented |
| INFRA-03 | MongoDB Atlas connection with Mongoose ODM and cached connection pattern for serverless | Exact connection.ts pattern from UPLOADKIT-GSD.md; global cache pattern verified; maxPoolSize settings documented |
| INFRA-04 | All Mongoose models implemented (User, Account, Project, ApiKey, File, FileRouter, Subscription, UsageRecord) | Complete model schemas in UPLOADKIT-GSD.md section 2.3; all 8 models with indexes documented |
| INFRA-05 | Cloudflare R2 bucket configured with CORS policy (explicit AllowedHeaders), lifecycle rules, and custom CDN domain | CORS exact config with AllowedHeaders list; lifecycle rule for aborted multipart; CDN domain wiring pattern |
| INFRA-06 | Upstash Redis rate limiting on all API endpoints | @upstash/ratelimit 2.0.8 verified; sliding window pattern; Edge-compatible HTTP client |
| INFRA-07 | Sentry error monitoring integrated across apps | @sentry/nextjs 10.47.0; wizard auto-instrumentation; App Router support confirmed |
| INFRA-08 | GitHub Actions CI/CD pipeline (lint, test, build, npm publish) | Turborepo remote cache in CI; Changesets action release PR flow; workflow structure documented |
| INFRA-09 | Changesets for SDK versioning with automated npm publish | @changesets/cli 2.30.0 verified; updateInternalDependencies setting; dry-run verification step |
</phase_requirements>

---

## Summary

Phase 1 is a pure infrastructure phase — no user-facing features, only the skeleton that every subsequent phase builds on. The primary deliverables are: the Turborepo + pnpm monorepo with all 11 packages/apps scaffolded, shared tooling configs (ESLint, TypeScript, Tailwind v4), all 8 Mongoose models with the cached connection, R2 bucket configuration with CORS, Upstash Redis setup, Sentry integration, Docker Compose for local dev, multi-stage Dockerfiles for production, and the GitHub Actions CI/CD pipeline with Changesets.

The most critical correctness concern is **R2 CORS configuration** — it must be done before any upload code is written in Phase 3. Wildcard `AllowedHeaders` silently breaks browser uploads; explicit header listing is required. The second critical concern is the **Mongoose cached connection pattern** — it must live in `packages/db` and must be the only place that calls `mongoose.connect()`. Getting this wrong causes connection exhaustion under load and is invisible during local development.

All package versions have been verified against the npm registry as of 2026-04-07. Notable updates from prior research: Turborepo is at 2.9.5 (was 2.9.4), tsup is at 8.5.1 (was 8.5.0), @changesets/cli is at 2.30.0, TypeScript is at 6.0.2, vitest is at 4.1.3, zod is at 4.3.6, next-auth@beta is at 5.0.0-beta.30.

**Primary recommendation:** Scaffold packages in dependency order — `packages/config` → `packages/shared` → `packages/db` → SDK skeletons → app skeletons. Establish R2 CORS and the Mongoose connection before writing any feature code. Use a single `docker-compose.yml` at repo root that covers both local dev (MongoDB + Redis + optional MinIO) and production (all app containers).

---

## Standard Stack

### Core — Verified Against npm Registry 2026-04-07

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| turbo | 2.9.5 | Task orchestration, caching, dependency graph | De facto standard for JS/TS monorepos; Rust-powered; 96% faster time-to-first-task in 2.9 |
| pnpm | 10.26.2 (installed) | Package manager + workspaces | Fastest installs; strict hoisting prevents phantom deps; native workspace protocol |
| @changesets/cli | 2.30.0 | SDK versioning, changelog, npm publish | Standard for multi-package repos; requires explicit human intent per change |
| next | 16.2.2 | App framework for all apps | Turbopack stable as default; React Compiler 1.0; App Router only |
| react / react-dom | 19.x | UI rendering | Required by Next.js 16; stable as of 2026 |
| typescript | 6.0.2 | Type safety across all packages | Strict mode required; SDK must export clean .d.ts |
| tailwindcss | 4.2.2 | Utility CSS for apps/dashboard/web/docs | CSS-first config via @theme; no tailwind.config.js |
| mongoose | 9.4.1 | MongoDB ODM for packages/db | Project constraint; schema validation; middleware hooks |
| @aws-sdk/client-s3 | 3.1026.0 | R2 client (S3-compatible) | Modular; tree-shakeable; ESM-native |
| @aws-sdk/s3-request-presigner | 3.1026.0 | Presigned URL generation | Standard for presigned PUT flow |
| @upstash/ratelimit | 2.0.8 | Rate limiting on API endpoints | HTTP-based; works in Edge; sliding window support |
| @sentry/nextjs | 10.47.0 | Error tracking + performance | Auto-instruments App Router, Route Handlers, Edge |
| tsup | 8.5.1 | SDK package bundler | ESM+CJS dual output with .d.ts in one command |
| vitest | 4.1.3 | Unit + integration tests | 3-5x faster than Jest; native ESM; Node.js 20+ required |
| zod | 4.3.6 | Schema validation + env parsing | Use everywhere external input is accepted |
| nanoid | 5.1.7 | Short unique ID generation | URL-safe; smaller than uuid |
| bcryptjs | 3.0.3 | API key hashing | Pure JS; no native bindings; safe in serverless |

### Supporting Tools

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next-auth@beta | 5.0.0-beta.30 | Auth.js v5 — dashboard session auth | Install as `next-auth@beta` NOT `@latest` which resolves to v4 |
| @tailwindcss/postcss | latest | PostCSS plugin for Tailwind v4 | Required by Tailwind v4 (replaces tailwind-merge for PostCSS) |
| eslint | 9.x | Linting | Flat config format in ESLint 9 |
| @typescript-eslint/eslint-plugin | 8.x | TypeScript lint rules | Part of packages/config/eslint |
| prettier | 3.x | Code formatting | Consistent style across all packages |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| turbo | nx | Turborepo is simpler config, better pnpm integration, Vercel-backed; NX is heavier but more powerful for very large monorepos |
| @changesets/cli | semantic-release | Changesets requires explicit intent; semantic-release infers from commits — error-prone for SDK where accidental breaking changes must be caught |
| Docker Compose local dev | Dev containers / Nix | Docker Compose is universally understood and available; already required for production; no additional tooling |

**Version verification note:** All versions above confirmed via `npm view [package] version` on 2026-04-07. TypeScript is now at 6.0.2 (not 5.x as prior research stated) — use `typescript@latest`. Mongoose is at 9.4.1 (not 8.x as prior research stated) — verify compatibility before locking.

**Installation (root):**
```bash
pnpm add -D turbo typescript @changesets/cli prettier eslint
```

**Installation (per Next.js app):**
```bash
pnpm add next@latest react@latest react-dom@latest
pnpm add -D @types/react @types/react-dom tailwindcss @tailwindcss/postcss
```

**Installation (packages/db):**
```bash
pnpm add mongoose
```

**Installation (storage + rate limiting + monitoring):**
```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
pnpm add @upstash/ratelimit @upstash/redis
pnpm add @sentry/nextjs
```

**Installation (utilities):**
```bash
pnpm add zod nanoid bcryptjs
pnpm add -D tsup vitest @vitest/coverage-v8
```

---

## Architecture Patterns

### Recommended Project Structure

```
uploadkit/
├── apps/
│   ├── api/                  # REST API (presigned URL issuer, metadata, billing webhooks)
│   │   ├── src/app/api/v1/   # Route Handlers — Node.js runtime only
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── dashboard/            # SaaS portal (Next.js App Router + Auth.js v5)
│   │   ├── src/app/
│   │   │   ├── (auth)/       # login/register routes
│   │   │   └── (app)/        # protected dashboard routes
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── web/                  # Landing page (Next.js, static generation)
│   │   ├── Dockerfile
│   │   └── package.json
│   └── docs/                 # Fumadocs site
│       ├── content/          # MDX files
│       ├── Dockerfile
│       └── package.json
├── packages/
│   ├── config/               # Shared dev configs — NO runtime exports
│   │   ├── eslint/           # eslint.config.js (flat config)
│   │   ├── typescript/       # tsconfig.base.json, tsconfig.nextjs.json
│   │   └── tailwind/         # tailwind.css (base @theme definitions)
│   ├── shared/               # @uploadkit/shared — types, constants, errors
│   │   ├── src/
│   │   │   ├── types.ts      # UploadFile, Project, ApiKey interfaces
│   │   │   ├── constants.ts  # TIERS, FILE_STATUSES, tier limits
│   │   │   ├── errors.ts     # UploadKitError hierarchy
│   │   │   └── utils.ts      # formatBytes, generateId, slugify
│   │   └── package.json
│   ├── db/                   # Mongoose models + cached connection
│   │   ├── src/
│   │   │   ├── models/       # user, account, project, api-key, file, file-router, subscription, usage-record
│   │   │   ├── connection.ts # Cached connection — THE only mongoose.connect() call
│   │   │   └── index.ts
│   │   └── package.json
│   ├── ui/                   # Internal shadcn/ui primitives (NOT part of public SDK)
│   │   ├── src/components/   # Button, Input, Dialog, Card, etc.
│   │   └── package.json
│   ├── core/                 # @uploadkit/core (skeleton in Phase 1, implemented in Phase 4)
│   │   └── package.json      # tsup config, peerDeps, sideEffects: false
│   ├── react/                # @uploadkit/react (skeleton in Phase 1)
│   │   └── package.json
│   └── next/                 # @uploadkit/next (skeleton in Phase 1)
│       └── package.json
├── scripts/
│   └── seed.ts               # pnpm seed — creates test user, project, API key, files
├── docker-compose.yml        # Local dev: MongoDB + Redis + MinIO
├── docker-compose.prod.yml   # Production: all app containers
├── turbo.json
├── pnpm-workspace.yaml
├── .env                      # Single root env file — all apps read from here
├── .env.example
└── package.json
```

### Pattern 1: Turborepo Pipeline Configuration

**What:** `turbo.json` declares task dependencies so packages build bottom-up: shared → db → apps in parallel. The `dev` task is persistent and cache-disabled; `build` caches outputs.

**When to use:** The canonical configuration for this monorepo.

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "persistent": true,
      "cache": false
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

**Build order guaranteed by `^build` dependsOn:**
1. `packages/config` (no deps)
2. `packages/shared` (depends on config)
3. `packages/db` (depends on shared)
4. `packages/core`, `packages/ui` (depend on shared) — parallel
5. `packages/react`, `packages/next` (depend on core) — parallel
6. All `apps/*` (depend on db, ui, shared) — parallel

### Pattern 2: pnpm Workspace Configuration

**What:** `pnpm-workspace.yaml` declares all workspace packages. Internal packages reference each other with `workspace:*` protocol — pnpm resolves to the local version, Changesets updates these to semver ranges on publish.

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

```json
// packages/db/package.json (example internal dep reference)
{
  "name": "@uploadkit/db",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@uploadkit/shared": "workspace:*",
    "mongoose": "^9.4.1"
  }
}
```

```json
// packages/core/package.json (public SDK package)
{
  "name": "@uploadkit/core",
  "version": "0.1.0",
  "sideEffects": false,
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "peerDependencies": {},
  "devDependencies": {
    "tsup": "^8.5.1",
    "typescript": "^6.0.2"
  }
}
```

### Pattern 3: TypeScript Shared Config

**What:** `packages/config/typescript/` exports base tsconfig files. All apps and packages extend from these. Enforces `strict: true`, `exactOptionalPropertyTypes: true`, and `moduleResolution: bundler` for modern ESM.

```json
// packages/config/typescript/tsconfig.base.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

```json
// packages/config/typescript/tsconfig.nextjs.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }]
  }
}
```

### Pattern 4: Mongoose Cached Connection

**What:** The single `connectDB()` function in `packages/db/src/connection.ts`. Stores the connection promise in a module-level global so it survives across serverless invocations in the same container. This is the ONLY place in the codebase that calls `mongoose.connect()`.

**When to use:** Called at the top of every API Route Handler that touches the database, before any Mongoose model query.

```typescript
// packages/db/src/connection.ts
// Source: UPLOADKIT-GSD.md section 2.3 (verified against Mongoose serverless pattern)
import mongoose from 'mongoose';

declare global {
  // eslint-disable-next-line no-var
  var mongoose: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

const globalWithMongoose = global as typeof global & {
  mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};

let cached = globalWithMongoose.mongoose;
if (!cached) {
  cached = globalWithMongoose.mongoose = { conn: null, promise: null };
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached!.conn) return cached!.conn;
  if (!cached!.promise) {
    cached!.promise = mongoose.connect(process.env.MONGODB_URI!, {
      maxPoolSize: process.env.NODE_ENV === 'production' ? 10 : 1,
      serverSelectionTimeoutMS: 5000,
    });
  }
  cached!.conn = await cached!.promise;
  return cached!.conn;
}
```

### Pattern 5: Tailwind v4 Shared Config

**What:** Tailwind v4 uses CSS-first configuration via `@theme` directive — no `tailwind.config.js`. The `packages/config/tailwind/` package exports a base CSS file with shared design tokens. Each app's global CSS file imports it.

```css
/* packages/config/tailwind/base.css */
@import "tailwindcss";

@theme {
  --color-surface: #0a0a0b;
  --color-surface-elevated: #141416;
  --color-text-primary: #fafafa;
  --color-text-secondary: #a1a1aa;
  --color-accent: #6366f1;
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --font-sans: "Geist", system-ui, sans-serif;
  --font-mono: "Geist Mono", monospace;
}
```

```css
/* apps/dashboard/src/app/globals.css */
@import "@uploadkit/config/tailwind/base.css";
/* dashboard-specific overrides below */
```

### Pattern 6: Docker Compose for Local Dev and Production

**What:** Single `docker-compose.yml` at repo root for local development (MongoDB + Redis + MinIO). Separate `docker-compose.prod.yml` for production (all 4 app containers + MongoDB + Redis).

```yaml
# docker-compose.yml (local dev — infrastructure services only)
version: "3.9"
services:
  mongodb:
    image: mongo:8
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: password

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"

volumes:
  mongodb_data:
  minio_data:
```

**Multi-stage Dockerfile pattern for Next.js apps:**
```dockerfile
# apps/dashboard/Dockerfile
FROM node:22-alpine AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/dashboard/package.json ./apps/dashboard/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN pnpm turbo build --filter=dashboard

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/dashboard/.next/standalone ./
COPY --from=builder /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=builder /app/apps/dashboard/public ./apps/dashboard/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/dashboard/server.js"]
```

> Note: Next.js `output: 'standalone'` must be set in `next.config.ts` for Docker standalone mode to work.

### Pattern 7: GitHub Actions CI Pipeline

**What:** CI runs lint + typecheck + test + build on every push/PR. Changesets action creates a "Version Packages" PR on merge to main; when that PR is merged, packages publish to npm.

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - uses: actions/cache@v4
        with:
          path: .turbo
          key: ${{ runner.os }}-turbo-${{ github.sha }}
          restore-keys: ${{ runner.os }}-turbo-
      - run: pnpm turbo lint typecheck build test
```

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Pattern 8: Upstash Redis Setup for Rate Limiting

**What:** Upstash Redis client uses HTTP — no persistent TCP connection required, making it Edge-compatible. Rate limiting is applied in API Route Handlers (Node.js runtime) or middleware (Edge), keyed by API key ID, not IP.

```typescript
// packages/db/src/rate-limit.ts (or apps/api/src/lib/rate-limit.ts)
// Source: @upstash/ratelimit 2.0.8 docs [ASSUMED - pattern from training knowledge]
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'uploadkit:ratelimit',
});
```

### Anti-Patterns to Avoid

- **Multiple `mongoose.connect()` calls:** Each app file calling connect independently causes connection storms. All DB connections go through `packages/db/src/connection.ts` exclusively.
- **`AllowedHeaders: ["*"]` in R2 CORS:** R2 rejects wildcard AllowedHeaders. Explicit list required: `["Content-Type", "Content-Length"]`.
- **Presigned URLs with CDN domain:** Presigned URLs MUST use the S3 API endpoint (`*.r2.cloudflarestorage.com`), never `cdn.uploadkit.dev`.
- **Mongoose in Edge middleware:** `middleware.ts` must never import from `packages/db`. Edge runtime has no `net`/`tls` modules.
- **Per-app `.env.local` files:** Decision D-02 locks a single root `.env`. Apps reference it via Turborepo's env passthrough configuration.
- **R2 POST Object API:** R2 does not support HTML form POST uploads. Always use presigned PUT URLs.
- **`framer-motion` package import:** Package renamed to `motion`. Import from `motion/react`.
- **`next-auth@latest`:** Resolves to v4. Must install `next-auth@beta` for Auth.js v5.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Task build orchestration with caching | Custom Makefile/npm scripts with manual deps | Turborepo `turbo.json` with `dependsOn` | Turborepo handles parallel builds, caching, remote caching with zero custom code |
| SDK package versioning | Manual version bumps + git tags | Changesets CLI | Handles changelog generation, version bumps across workspace packages, npm publish atomically |
| Rate limiting | Custom Redis counter logic | `@upstash/ratelimit` sliding window | Handles sliding window math, local caching between invocations, race conditions, analytics |
| MongoDB connection pooling for serverless | Custom connection tracking | Global-cached `connectDB()` pattern from `packages/db` | Well-tested pattern for serverless; custom solutions miss edge cases (reconnect on error, promise caching) |
| R2 presigned URLs | Custom HMAC signing | `@aws-sdk/s3-request-presigner` | AWS SDK v3 handles all signing complexities including signature expiry, Content-Type binding |
| Error tracking | Custom error logging | `@sentry/nextjs` wizard | Auto-instruments App Router, Server Actions, Edge middleware — custom solutions miss entire surfaces |
| TypeScript ESM+CJS dual builds | Custom esbuild scripts | `tsup` | Handles declaration maps, source maps, external deps, format variants in a single 10-line config |

**Key insight:** This phase is infrastructure scaffolding — every tool listed above has solved these problems better than any custom implementation. The value is in wiring them together correctly, not in building alternatives.

---

## Common Pitfalls

### Pitfall 1: R2 CORS — `AllowedHeaders: ["*"]` Silently Breaks Uploads

**What goes wrong:** Browser presigned PUT uploads fail with CORS errors from day one. Works from curl/Postman but not from a browser. Wastes days diagnosing.

**Why it happens:** R2 rejects wildcard `AllowedHeaders`. The preflight OPTIONS is rejected before auth is checked.

**How to avoid:** Configure the exact CORS policy shown below during bucket creation, before any upload code:

```json
[
  {
    "AllowedOrigins": ["https://uploadkit.dev", "https://app.uploadkit.dev", "http://localhost:3000"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

Apply separately to both `uploadkit-dev` and `uploadkit-prod` buckets.

**Warning signs:** Upload works from Postman but not from browser; `AllowedHeaders: ["*"]` in bucket config.

---

### Pitfall 2: Mongoose Connection Storming Under Concurrent Load

**What goes wrong:** 50 concurrent API requests each open a new MongoDB connection. Atlas connection limit is hit. API requests fail with timeout errors. Invisible during local development.

**Why it happens:** Serverless functions are stateless — each cold start opens a new connection without the cached pattern.

**How to avoid:** The `connectDB()` function in `packages/db/src/connection.ts` uses a global promise cache. Set `maxPoolSize: 1` in dev, `maxPoolSize: 10` in production. This is the only `mongoose.connect()` call in the entire codebase.

**Warning signs:** Individual app files calling `mongoose.connect()`; no `global.mongoose` cache.

---

### Pitfall 3: Mongoose in Edge Middleware

**What goes wrong:** `middleware.ts` imports from `packages/db` to validate API keys. Deployment fails with "The edge runtime does not support Node.js 'net' module."

**Why it happens:** Edge runtime has no TCP socket support. Mongoose requires TCP to connect to MongoDB.

**How to avoid:** `middleware.ts` handles only: Auth.js JWT session validation (Edge-safe) and Upstash Redis rate limiting (HTTP-based, Edge-safe). API key validation (`uk_live_*` lookup) happens inside Route Handlers (Node.js runtime). Use `matcher` in middleware config to exclude `/api/v1/*` from Auth.js middleware entirely.

**Warning signs:** `middleware.ts` imports from `packages/db` or `mongoose`.

---

### Pitfall 4: Turborepo `dev` Task Caching

**What goes wrong:** Running `pnpm dev` for the first time fails because `packages/shared` and `packages/db` haven't been built yet. Imports from workspace packages fail with "Module not found."

**Why it happens:** The `dev` task is persistent and cache-disabled, but it still depends on `^build` — all upstream packages must be built first.

**How to avoid:** Ensure `turbo.json` has `"dev": { "dependsOn": ["^build"] }`. The first run requires `pnpm build` before `pnpm dev`. Alternatively, configure TypeScript path aliases that point to source files for dev-mode imports.

**Warning signs:** App fails to start on fresh clone; TypeScript can't resolve `@uploadkit/shared`.

---

### Pitfall 5: Next.js `output: 'standalone'` Missing for Docker

**What goes wrong:** The multi-stage Dockerfile copies `.next/standalone` but it doesn't exist because `output: 'standalone'` wasn't set in `next.config.ts`. Docker image either fails to build or the runner stage doesn't have a startup script.

**Why it happens:** Next.js standalone output is opt-in — it's not the default build output.

**How to avoid:** Set `output: 'standalone'` in `next.config.ts` for every app that has a Dockerfile. This generates a `server.js` and copies only the minimum node_modules needed to run.

```typescript
// apps/dashboard/next.config.ts
const nextConfig = {
  output: 'standalone',
};
export default nextConfig;
```

**Warning signs:** `.next/standalone/` directory absent after build; Docker `COPY --from=builder` fails.

---

### Pitfall 6: Single `.env` File — Turborepo Env Variable Passthrough

**What goes wrong:** Decision D-02 uses a single root `.env`. But Turborepo by default does not make environment variables available to tasks unless they are declared in `turbo.json` under `env` or `globalEnv`. Apps may not see the vars from the root `.env`.

**Why it happens:** Turborepo's caching system requires explicit env var declarations to include them in cache keys. Without this, vars may be missing when tasks run in CI or via `turbo run`.

**How to avoid:** Declare all env vars used across all tasks in `turbo.json` under `globalEnv`:

```json
// turbo.json
{
  "globalEnv": [
    "MONGODB_URI",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "SENTRY_DSN",
    "NODE_ENV"
  ],
  "tasks": { ... }
}
```

Also use `dotenv` loading in the root `package.json` scripts or configure pnpm to load `.env` from the workspace root.

**Warning signs:** Apps can't read env vars when started via `pnpm dev`; CI builds missing connection strings.

---

### Pitfall 7: Changesets `updateInternalDependencies` Not Set

**What goes wrong:** `@uploadkit/core` is published at 0.2.0. `@uploadkit/react` still has `"@uploadkit/core": "workspace:*"` in its package.json. The published `@uploadkit/react` on npm points to the workspace protocol (unresolvable), or Changesets updates it to `^0.1.0` (the old version).

**Why it happens:** Changesets' default behavior for internal package version updates can leave inter-package dependencies stale or with incorrect ranges.

**How to avoid:** In `.changeset/config.json`, set `"updateInternalDependencies": "patch"` so Changesets always keeps internal package references in sync when any package is versioned.

```json
// .changeset/config.json
{
  "$schema": "https://unpkg.com/@changesets/config@latest/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@uploadkit/db", "@uploadkit/shared", "@uploadkit/config"]
}
```

Note: `ignore` lists the private packages that are never published to npm.

---

## Code Examples

### Mongoose Models (from UPLOADKIT-GSD.md section 2.3)

All 8 models are fully specified in `UPLOADKIT-GSD.md`. Key indexes to note:

```typescript
// File model — compound index for paginated file browser queries
fileSchema.index({ projectId: 1, createdAt: -1 });
fileSchema.index({ status: 1 });

// FileRouter — unique per project
fileRouterSchema.index({ projectId: 1, slug: 1 }, { unique: true });

// UsageRecord — unique per user per billing period
usageRecordSchema.index({ userId: 1, period: 1 }, { unique: true });

// Account — unique OAuth identity
accountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true });
```

Note on `UsageRecord`: The spec uses `userId` as the grouping field. The REQUIREMENTS.md description says "per user per period" — this is consistent with the schema in UPLOADKIT-GSD.md. However, the ARCHITECTURE.md documents usage as per-Project. If usage is tracked at project level (which is what the billing and tier enforcement flow requires), a `projectId` field should be added or `userId` should be replaced. This is an open question flagged below.

### R2 Client Setup

```typescript
// apps/api/src/lib/storage.ts
// Source: @aws-sdk/client-s3 + Cloudflare R2 docs [VERIFIED: STACK.md, ARCHITECTURE.md]
import { S3Client } from '@aws-sdk/client-s3';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKET =
  process.env.NODE_ENV === 'production' ? 'uploadkit-prod' : 'uploadkit-dev';

export const CDN_URL = process.env.NODE_ENV === 'production'
  ? 'https://cdn.uploadkit.dev'
  : `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;
```

### Presigned URL Generation

```typescript
// apps/api/src/lib/presign.ts
// Source: @aws-sdk/s3-request-presigner pattern [VERIFIED: STACK.md]
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET } from './storage';

export async function generatePresignedPutUrl(params: {
  key: string;        // {projectId}/{fileRouterId}/{uuid}/{filename}
  contentType: string;
  contentLength: number;
  expiresIn?: number; // seconds, default 900 (15 min)
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: params.key,
    ContentType: params.contentType,
    ContentLength: params.contentLength,
  });
  return getSignedUrl(r2Client, command, {
    expiresIn: params.expiresIn ?? 900,
  });
}
```

### tsup Config for SDK Packages

```typescript
// packages/core/tsup.config.ts
// Source: tsup 8.5.1 [VERIFIED: STACK.md]
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [], // @uploadkit/core has zero runtime deps
  splitting: false,
  treeshake: true,
});
```

```typescript
// packages/react/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', '@uploadkit/core'],
  splitting: true,    // enables per-component tree-shaking
  treeshake: true,
});
```

### Seed Script Structure

```typescript
// scripts/seed.ts — run as: pnpm seed
import { connectDB } from '@uploadkit/db';
import { User, Project, ApiKey, File } from '@uploadkit/db';

async function seed() {
  await connectDB();

  const user = await User.create({
    name: 'Test User',
    email: 'test@uploadkit.dev',
  });

  const project = await Project.create({
    name: 'Test Project',
    slug: 'test-project',
    userId: user._id,
  });

  await ApiKey.create({
    key: 'uk_test_seed_key_abc123',
    name: 'Seed API Key',
    projectId: project._id,
    isTest: true,
  });

  await File.create({
    key: `${project._id}/default/seed-uuid/sample.jpg`,
    name: 'sample.jpg',
    size: 1024 * 50,
    type: 'image/jpeg',
    url: 'https://example.com/sample.jpg',
    status: 'UPLOADED',
    projectId: project._id,
  });

  console.log('Seed complete');
  process.exit(0);
}

seed().catch(console.error);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` | CSS-first config via `@theme` in CSS | Tailwind v4 (2024) | No JS config file; tokens live in CSS; PostCSS plugin required |
| `framer-motion` package | `motion` package, import from `motion/react` | motion v11+ (2024) | Old package still works but won't receive updates |
| `next-auth@4` with `authOptions` | `next-auth@beta` (Auth.js v5) with single `auth()` export | 2024 | Breaking API change; v4 lacks App Router support |
| Lerna for monorepos | Turborepo + pnpm workspaces + Changesets | 2022–2023 | Lerna obsolete; separate tools do jobs better |
| `mongoose.connect()` per file | Global-cached `connectDB()` in packages/db | Always correct; widely adopted pattern post-2021 | Without this, serverless connection exhaustion is guaranteed |
| TypeScript `moduleResolution: node` | `moduleResolution: bundler` | TypeScript 5+ | Required for modern ESM package resolution |

**Deprecated/outdated patterns NOT to use:**
- `tailwind.config.js`: Replaced by CSS `@theme`
- `framer-motion` package name: Import `motion` instead
- `next-auth@latest` (resolves to v4): Use `next-auth@beta`
- Stripe `UsageRecord` API: Removed in API `2025-03-31.basil`; use Meters API
- TypeScript 5.x: Current is 6.0.2 — `typescript@latest` installs 6.x

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Mongoose 9.4.1 (latest) is backward-compatible with the schema patterns shown in UPLOADKIT-GSD.md which were written for Mongoose 8.x | Standard Stack | Model schemas or connection API may differ; verify `mongoose@9` migration guide before writing models |
| A2 | TypeScript 6.0.2 is compatible with tsup 8.5.1 and all Next.js 16 tooling | Standard Stack | A major TypeScript version bump (5→6) may have breaking changes for tooling; verify before locking |
| A3 | Upstash Redis rate-limiting setup pattern (Redis.fromEnv() + Ratelimit constructor) is still valid for @upstash/ratelimit 2.0.8 | Code Examples | API may have changed; verify against current @upstash/ratelimit README before implementation |
| A4 | `pnpm/action-setup@v4` supports pnpm 10.x in GitHub Actions | Architecture Patterns (CI) | Older action versions may not support pnpm 10; verify action changelog |
| A5 | UsageRecord model uses `userId` as grouping field (from UPLOADKIT-GSD.md), but billing enforcement requires per-project usage tracking | Code Examples | If usage is per-project not per-user, the model needs a `projectId` field or the query logic changes in Phase 7 |

---

## Open Questions

1. **UsageRecord: per-user vs per-project?**
   - What we know: `UPLOADKIT-GSD.md` schema has `userId` as the grouping field; REQUIREMENTS.md (BILL-05) says "Usage tracking with MongoDB atomic $inc counters per user per period"; ARCHITECTURE.md shows usage in the API layer keyed by Project
   - What's unclear: Tier limits (Free/Pro/Team) are per-account; individual projects within an account could collectively hit the limit. Should `UsageRecord` track by `userId` (account-level) or `projectId` (project-level)?
   - Recommendation: Add both `userId` and `projectId` to `UsageRecord` — enables querying at either level. Enforce tier limits at user level (sum across projects), display at project level in dashboard. Confirm with user before implementing Phase 1 models.

2. **MinIO vs Real R2 for Local Dev**
   - What we know: CONTEXT.md (specifics) mentions "optionally MinIO as local S3-compatible storage for offline R2 testing"
   - What's unclear: Should MinIO be included in `docker-compose.yml` by default, or is it optional infrastructure?
   - Recommendation: Include MinIO in `docker-compose.yml` with a comment that it's optional. Configure the seed script and local `.env` to use MinIO by default. Developers who have R2 credentials can override `R2_*` env vars to use real R2.

3. **Turborepo Remote Cache — Vercel vs Self-Hosted**
   - What we know: Turborepo supports remote caching; Vercel provides a free remote cache; project is deploying to Coolify not Vercel
   - What's unclear: Should CI use Vercel remote cache (free but couples to Vercel account) or skip remote caching for now?
   - Recommendation: Use Turborepo's built-in remote caching with a self-hosted cache endpoint, or skip for Phase 1 and add in Phase 10 (CI/CD phase). The CI pipeline works without it — remote cache is a performance optimization, not a correctness requirement.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 22 | All runtime tasks | ✓ | v22.22.0 | — |
| pnpm | Package manager | ✓ | 10.26.2 | — |
| Docker | Local dev MongoDB/Redis, production containers | ✓ | 29.2.0 | — |
| Docker Compose | Local dev orchestration | ✓ | v5.0.2 | — |
| git | Version control | ✓ | 2.49.0 | — |

**No missing dependencies with no fallback for this phase.**

Note: Cloudflare R2 buckets (`uploadkit-dev`, `uploadkit-prod`) and Upstash Redis instance must be created manually in their respective consoles before Phase 1 tasks involving cloud setup can be verified. These are external services, not local tooling.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.3 |
| Config file | `vitest.config.ts` at repo root (Wave 0 gap — does not exist yet) |
| Quick run command | `pnpm vitest run --reporter=verbose` |
| Full suite command | `pnpm turbo test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | `pnpm install && pnpm build` succeeds from root | smoke | `pnpm turbo build 2>&1 \| tail -5` | ❌ Wave 0 |
| INFRA-02 | Apps can import and use shared configs without TS errors | unit/typecheck | `pnpm turbo typecheck` | ❌ Wave 0 |
| INFRA-03 | `connectDB()` returns cached connection; second call reuses the first | unit | `pnpm vitest run packages/db/src/__tests__/connection.test.ts` | ❌ Wave 0 |
| INFRA-04 | All 8 Mongoose models can be imported and instantiated without errors | unit | `pnpm vitest run packages/db/src/__tests__/models.test.ts` | ❌ Wave 0 |
| INFRA-05 | R2 bucket accepts a presigned PUT URL (200 response, CORS headers present) | integration/manual | Manual: `curl -X PUT` from browser DevTools | manual-only (requires live R2) |
| INFRA-06 | Rate limiter returns 429 after 10 requests/min per key | unit | `pnpm vitest run packages/db/src/__tests__/rate-limit.test.ts` (mock Redis) | ❌ Wave 0 |
| INFRA-07 | Sentry is configured and a test error surfaces in Sentry dashboard | manual | Manual: trigger a test error via Sentry wizard verification | manual-only |
| INFRA-08 | GitHub Actions CI run completes green on clean push | smoke | Push to branch, observe Actions tab | manual-only (requires GH push) |
| INFRA-09 | `changeset version` bumps versions and produces correct changelog | smoke | `pnpm changeset version --dry-run` | can be scripted |

### Sampling Rate

- **Per task commit:** `pnpm turbo typecheck build` (fast, covers structural correctness)
- **Per wave merge:** `pnpm turbo lint typecheck build test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` at repo root — shared Vitest configuration
- [ ] `packages/db/src/__tests__/connection.test.ts` — covers INFRA-03
- [ ] `packages/db/src/__tests__/models.test.ts` — covers INFRA-04
- [ ] `packages/db/src/__tests__/rate-limit.test.ts` — covers INFRA-06 (with mocked Upstash)
- [ ] Framework install: `pnpm add -D vitest @vitest/coverage-v8` in root package.json

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Auth.js v5 (Phase 2) |
| V3 Session Management | no | Auth.js JWT strategy (Phase 2) |
| V4 Access Control | partial | API key structure established (uk_live_/uk_test_ prefix); key hashed with bcryptjs |
| V5 Input Validation | yes | zod for all env var parsing and API inputs |
| V6 Cryptography | yes | bcryptjs for API key storage; never store raw keys |

### Known Threat Patterns for This Phase's Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Exposed API keys in git | Information Disclosure | `.env` in `.gitignore`; `.env.example` with placeholder values; no real keys in code |
| R2 credentials in browser bundle | Information Disclosure | R2 credentials only in server-side code; never in `NEXT_PUBLIC_*` env vars |
| MongoDB connection string leaked | Information Disclosure | `MONGODB_URI` server-only; not passed to Next.js client bundle |
| Wildcard R2 CORS AllowedOrigins in prod | Elevation of Privilege | Explicit origin allowlist for production bucket CORS policy |
| Docker secrets in image layers | Information Disclosure | Multi-stage build; secrets injected at runtime via env vars, not baked into image |

---

## Sources

### Primary (HIGH confidence)

- npm registry (live query 2026-04-07) — all package versions verified
- `.planning/research/STACK.md` — comprehensive stack research with confirmed versions
- `.planning/research/ARCHITECTURE.md` — monorepo structure, build order, patterns
- `.planning/research/PITFALLS.md` — R2 CORS, Mongoose connection, Edge middleware pitfalls
- `UPLOADKIT-GSD.md` section 2.3 — complete Mongoose model schemas and connection pattern
- `UPLOADKIT-GSD.md` section 1.3 — canonical monorepo directory structure
- `.planning/phases/01-monorepo-infrastructure/01-CONTEXT.md` — locked user decisions D-01 through D-13

### Secondary (MEDIUM confidence)

- Turborepo docs (via ARCHITECTURE.md) — `turbo.json` task pipeline with `dependsOn`, outputs
- Cloudflare R2 CORS docs (via PITFALLS.md) — explicit AllowedHeaders requirement verified
- Next.js standalone output docs (via training knowledge) — required for Docker multi-stage builds [ASSUMED: A6 - verify `output: 'standalone'` still works in Next.js 16]

### Tertiary (LOW confidence)

- Upstash @upstash/ratelimit README — `Redis.fromEnv()` pattern [ASSUMED: A3]
- TypeScript 6.0.2 compatibility with tsup and Next.js 16 toolchain [ASSUMED: A2]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via live npm registry on 2026-04-07
- Architecture: HIGH — patterns verified in ARCHITECTURE.md, STACK.md, and UPLOADKIT-GSD.md
- Pitfalls: HIGH — R2 CORS, Mongoose connection, Edge middleware pitfalls all sourced from official docs in PITFALLS.md
- TypeScript 6.x compatibility: LOW — major version bump (5→6) not yet verified for tsup/Next.js 16 compatibility

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable infrastructure, 30-day window)
