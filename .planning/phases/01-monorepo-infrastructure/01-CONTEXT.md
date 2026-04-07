# Phase 1: Monorepo & Infrastructure - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up the complete Turborepo + pnpm monorepo skeleton with all shared tooling, cloud services (R2, MongoDB, Redis, Sentry), Docker deployment configs, and CI/CD — the foundation every future phase builds on. No user-facing features; pure infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Dev Environment
- **D-01:** MongoDB runs locally via Docker Compose (not Atlas-only). Developers use `docker compose up` to get a local MongoDB instance.
- **D-02:** Single `.env` file at the repo root. All apps read from it. No per-app `.env.local` files — one source of truth.
- **D-03:** Include a basic seed script that creates a test user, project, API key, and sample files. This runs as `pnpm seed` from the root.

### Package Boundaries
- **D-04:** `packages/shared` contains TypeScript types/interfaces, utility functions (formatBytes, generateId, etc.), and shared constants (TIERS, FILE_STATUSES, etc.).
- **D-05:** `packages/ui` is the shadcn/ui base — primitives only (Button, Input, Dialog, etc.). Dashboard imports and composes them into higher-level components (DataTable, MetricCard) within its own codebase.
- **D-06:** `packages/config` holds all three shared configs: ESLint, TypeScript, and Tailwind v4. Each app extends from these.

### R2 + CDN Setup
- **D-07:** Separate R2 buckets per environment: `uploadkit-dev` and `uploadkit-prod`. No shared buckets.
- **D-08:** CDN domain: `cdn.uploadkit.dev` pointing to the prod R2 bucket only. Dev uses R2 direct URLs (no CDN domain for dev).
- **D-09:** R2 key path structure confirmed: `{projectId}/{fileRouterId}/{uuid}/{filename}` (e.g., `proj_abc123/imageUploader/550e8400-e29b/photo.jpg`).

### Deploy Target
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specification
- `UPLOADKIT-GSD.md` — Full project spec including monorepo structure (section 1.3), Mongoose models (section 2.3), API endpoints (section 2.4), R2 config (section 7), and env variables (section 10)

### Research
- `.planning/research/STACK.md` — Verified 2026 stack with versions (Next.js 16, Turborepo 2.9.4, tsup 8.5.0, Motion replaces framer-motion, Auth.js v5 via next-auth@beta)
- `.planning/research/ARCHITECTURE.md` — Component boundaries, data flows, build order
- `.planning/research/PITFALLS.md` — Critical pitfalls (R2 CORS AllowedHeaders, Mongoose not on Edge, Stripe Meters API)

### Project Planning
- `.planning/PROJECT.md` — Project context, core value, constraints
- `.planning/REQUIREMENTS.md` — INFRA-01 through INFRA-07 are this phase's scope

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — this phase establishes all patterns

### Integration Points
- This phase creates the foundation all other phases build on
- `packages/db` must export Mongoose models + cached connection for all API routes
- `packages/shared` must export types consumed by every other package
- `packages/config` must export configs that all apps and packages extend

</code_context>

<specifics>
## Specific Ideas

- Research found Next.js 16 is current (not 15 as spec states) — use Next.js 16 with Turbopack as default bundler
- `motion` package replaces `framer-motion` — install `motion`, import from `motion/react`
- Auth.js v5 installs via `next-auth@beta` (not `@latest` which resolves to v4)
- Mongoose MUST NOT run in Edge Runtime — all DB access in Node.js runtime Route Handlers only
- R2 CORS must explicitly list AllowedHeaders (wildcard causes PUT to fail)
- Docker Compose for local dev should include: MongoDB, Redis (for rate limiting dev), and optionally MinIO as local S3-compatible storage for offline R2 testing

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-monorepo-infrastructure*
*Context gathered: 2026-04-07*
