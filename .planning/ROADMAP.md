# Roadmap: UploadKit

## Overview

UploadKit ships in 10 phases derived from its requirement categories and their natural dependencies. Phase 1 establishes the monorepo and all infrastructure primitives — R2, MongoDB, Redis, Sentry, CI/CD — so every subsequent phase builds on a stable, observable foundation. Phases 2-5 build the product core: auth, the upload API, and the full SDK surface (core, Next.js, React). Phases 6-7 deliver the SaaS shell — dashboard and billing with metered Stripe integration. Phases 8-9 build the public-facing web (landing, pricing, docs). Phase 10 closes the loop with end-to-end testing, npm publish, and launch readiness.

## Phases

**Phase Numbering:**
- Integer phases (1-10): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Monorepo & Infrastructure** - Turborepo monorepo, R2, MongoDB, Redis, Sentry, CI/CD, Changesets (completed 2026-04-07)
- [x] **Phase 2: Authentication** - Auth.js v5 with GitHub, Google, and magic link; persistent sessions (completed 2026-04-08)
- [x] **Phase 3: Upload Flow & REST API** - Presigned URL pipeline, multipart, abort/retry, full file/project/key REST API (completed 2026-04-08)
- [x] **Phase 4: SDK Core & Next.js Adapter** - @uploadkit/core factory, BYOS mode, @uploadkit/next file router pattern (completed 2026-04-08)
- [x] **Phase 5: SDK React Components** - UploadButton, Dropzone, Modal, FileList, FilePreview, hook, theming, a11y (completed 2026-04-08)
- [x] **Phase 6: Dashboard** - Auth shell, project/file/key management, upload logs, usage, command palette (completed 2026-04-08)
- [x] **Phase 7: Billing & Email** - Stripe Checkout, Billing Portal, metered overages, Resend transactional emails (completed 2026-04-08)
- [x] **Phase 8: Landing & Pricing Pages** - Hero, code demo, feature grid, competitor table, pricing page (completed 2026-04-08)
- [ ] **Phase 9: Documentation** - Fumadocs site, quickstart, SDK reference, API reference, guides
- [x] **Phase 10: Testing, Publishing & Launch** - Vitest unit tests, Playwright E2E, npm publish, launch readiness (completed 2026-04-09)
- [x] **Phase 11: MCP Remote Server** - Streamable HTTP MCP at api.uploadkit.dev/v1/mcp, shared mcp-core package, ChatGPT/Claude.ai connector compatibility (completed 2026-04-14)

### Milestone: Growth v1 (adquisición orgánica)

Goal: 200-500 GitHub stars, 2-3 keywords ranqueando top 10, 10k visitas orgánicas/mes en 3 meses. Sin dependencia de karma en redes — 100% canales ungated: CLI, playgrounds embebibles, integraciones con generadores IA, SEO programático, herramientas free.

- [ ] **Phase 12: `create-uploadkit-app` CLI** - Scaffolder `npx create-uploadkit-app` con templates (Next.js, SvelteKit, Remix, Vite), detección de package manager, prompts interactivos, setup de `.env.local` con API key placeholder
- [ ] **Phase 12.5: `uploadkit` CLI for existing projects** *(INSERTED — primary user role)* - `npx uploadkit init` detecta framework e instala deps + route handler + provider en proyecto existente; `npx uploadkit add <component>` añade componentes shadcn-style. Es el flujo principal: 80% de usuarios tienen proyecto existente
- [ ] **Phase 13: Interactive Playgrounds** - 4 playgrounds embebibles (StackBlitz + CodeSandbox) cubriendo Dropzone, Cropper, UploadQueue, BYOS; botón "Try live" en blog posts y docs
- [ ] **Phase 14: AI Generator Integrations** - MDC rules files para Cursor/Windsurf/Zed, awesome-cursorrules PR, outreach a v0.dev/bolt.new/Lovable pidiendo UploadKit en sus component pickers, llms.txt en la landing
- [ ] **Phase 15: Programmatic SEO — Framework Landing Pages** - 20 páginas `/uploads/<framework>` (Next.js, SvelteKit, Remix, Nuxt, Astro, RedwoodJS, Solid, Qwik, Gatsby, Vue, Angular, etc.) con estructura: hero específico, code snippet, presigned URL walkthrough, CTA. Sitemap + metadata SEO completa
- [ ] **Phase 16: Free Developer Tools** - 3 herramientas client-side en `/tools/`: MIME type validator (drag file → detect), presigned URL generator playground (form → curl output), upload cost calculator (S3 vs R2 vs B2 con inputs de GB + requests + egress)

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
- [x] 02-02-PLAN.md — Login page UI, protected dashboard layout, overview page, end-to-end verification

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
- [x] 03-01-PLAN.md — API foundation: package deps, withApiKey wrapper, error serializer, Zod schemas, model patches
- [x] 03-02-PLAN.md — Upload pipeline: presigned URL request, complete, multipart init/complete/abort
- [x] 03-03-PLAN.md — REST CRUD: files, projects, API keys, file routers, usage endpoints
- [x] 03-04-PLAN.md — Upload logs polling endpoint and orphaned upload cleanup cron job

### Phase 4: SDK Core & Next.js Adapter
**Goal**: `@uploadkit/core` and `@uploadkit/next` are published-ready packages that work in both managed and BYOS modes, giving Next.js developers a typed file router pattern
**Depends on**: Phase 3
**Requirements**: SDK-01, SDK-02, SDK-03, SDK-04, SDK-05, SDK-06, NEXT-01, NEXT-02, NEXT-03, NEXT-04, NEXT-05
**Success Criteria** (what must be TRUE):
  1. `createUploadKit({ apiKey })` returns a client that can upload a file, report progress, and delete a file — verified in a unit test
  2. Switching to BYOS mode (developer-provided S3 credentials) requires zero frontend changes; all credential usage is server-side only
  3. A Next.js App Router project can define a `fileRouter`, call `createUploadKitHandler`, and receive a fully typed `AppFileRouter` type inferred on the client
  4. `pnpm build` produces tree-shakeable ESM + CJS output with zero external runtime dependencies in `@uploadkit/core`
**Plans**: 2 plans
Plans:
- [x] 04-01-PLAN.md — @uploadkit/core: createUploadKit factory, upload (single+multipart), XHR progress, retry, listFiles, deleteFile
- [x] 04-02-PLAN.md — @uploadkit/next: createUploadKitHandler, FileRouter types, middleware, BYOS presigned URLs, generateReactHelpers stub

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
- [x] 05-01-PLAN.md — Provider context, useUploadKit hook, styles.css theming, build config
- [x] 05-02-PLAN.md — UploadButton with states/variants, UploadDropzone with drag-and-drop
- [x] 05-03-PLAN.md — UploadModal (native dialog), FileList, FilePreview with canvas thumbnails
- [x] 05-04-PLAN.md — generateReactHelpers factory, accessibility audit, final exports
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
**Plans**: 5 plans
Plans:
- [x] 06-01-PLAN.md — shadcn/ui init in packages/ui, dashboard deps, layout shell (sidebar, header, breadcrumbs, providers)
- [x] 06-02-PLAN.md — Overview page (metric cards, upload chart, recent files) + project CRUD with slug routing
- [x] 06-03-PLAN.md — File browser DataTable + API keys management + file routes configuration
- [x] 06-04-PLAN.md — Upload logs with polling + usage page with charts + billing shell + settings
- [x] 06-05-PLAN.md — Command palette (cmd+k) + project settings + visual verification checkpoint
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
- [x] 07-01-PLAN.md — Stripe client singletons, Checkout + Portal endpoints, billing page, setup script
- [x] 07-02-PLAN.md — Stripe webhook handler, Meters API integration, soft tier limit enforcement
- [x] 07-03-PLAN.md — packages/emails workspace package with React Email templates (welcome, usage alert, invoice)
- [x] 07-04-PLAN.md — Wire email triggers: welcome on signup, usage alerts on threshold, invoice emails on webhooks

### Phase 8: Landing & Pricing Pages
**Goal**: The public landing page and pricing page are live, visually competitive with Vercel/Linear, fully responsive, SEO-ready, and convert visitors to signups
**Depends on**: Phase 2
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04, LAND-05, LAND-06, LAND-07, LAND-08, LAND-09, LAND-10, PRICE-01, PRICE-02, PRICE-03, PRICE-04
**Success Criteria** (what must be TRUE):
  1. Landing hero section renders an animated code snippet and "5GB free" badge; all Framer Motion entrance animations play on first load and respect `prefers-reduced-motion`
  2. The interactive code demo tab switches between Next.js, React, and API examples and shows a live component preview (UploadButton/Dropzone/Modal) with dark/light toggle
  3. The pricing page shows all four tiers with a monthly/yearly toggle that recalculates prices (20% annual discount); the overage pricing section is visible below the tier table
  4. The page scores 90+ on Lighthouse for Performance, Accessibility, and SEO on both mobile and desktop
**Plans**: 3 plans
Plans:
- [x] 08-01-PLAN.md — Web app foundation: fonts (Satoshi+Inter), dark theme, Shiki singleton, tier data utils, navbar, hero section
- [x] 08-02-PLAN.md — Landing page sections: code demo, features grid, comparison table, component showcase, pricing preview, footer, scroll animations
- [x] 08-03-PLAN.md — Pricing page: monthly/yearly toggle, 4 tier cards, feature comparison matrix, overage pricing, SEO metadata + OG images
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
- [x] 09-01-PLAN.md — Fumadocs site setup, MDX pipeline, sidebar hierarchy, search
- [x] 09-02-PLAN.md — Getting Started (quickstart, Next.js, React, API-only) + Core Concepts
- [x] 09-03-PLAN.md — SDK Reference (@uploadkit/core, @uploadkit/react, @uploadkit/next)
- [x] 09-04-PLAN.md — REST API Reference, Guides (incl. migration from UploadThing), Dashboard docs

### Phase 10: Testing, Publishing & Launch
**Goal**: The full SDK is published to npm with correct versions and changelogs; the codebase has Vitest unit coverage on critical paths and Playwright E2E tests on the upload and auth flows; the project is launch-ready
**Depends on**: Phase 9
**Requirements**: INFRA-08, INFRA-09
**Success Criteria** (what must be TRUE):
  1. `pnpm publish` (via Changesets) publishes `@uploadkit/core`, `@uploadkit/react`, and `@uploadkit/next` to npm with correct semver and CHANGELOG.md entries
  2. Vitest unit tests cover upload flow (request, multipart, retry, abort), BYOS presigned URL generation, tier limit enforcement, and Stripe webhook handlers — all green
  3. Playwright E2E tests cover: sign up via GitHub OAuth -> create project -> upload a file via dashboard -> verify file appears in file browser -> delete file
  4. GitHub Actions CI run on main passes lint, type-check, unit tests, and build in under 5 minutes
**Plans**: 4 plans
Plans:
- [x] 10-01-PLAN.md — API unit tests: withApiKey, errors, upload routes, CRUD, tier enforcement, Stripe webhooks
- [x] 10-02-PLAN.md — SDK + React tests: core validation/single/multipart/http, React useUploadKit hook
- [x] 10-03-PLAN.md — Playwright E2E: auth, upload, dashboard CRUD, billing, docs navigation
- [x] 10-04-PLAN.md — Publish prep: polished READMEs, changeset entry, verify script, CI update

### Phase 11: MCP Remote Server
**Goal**: A public HTTP MCP server is live at `/v1/mcp` inside the `api` service, exposing the same tools as `@uploadkitdev/mcp` (stdio), so that ChatGPT, Claude.ai web, Smithery, and any remote MCP client can connect to UploadKit without `npx`. Stdio and HTTP share a single source of truth for the component catalog, scaffolds, and docs index.
**Depends on**: Phase 3, Phase 9
**Requirements**: New (post-v1.0 — captured directly here)
**Success Criteria** (what must be TRUE):
  1. `POST /v1/mcp` on the `api` service responds to a Streamable HTTP MCP `initialize` handshake and returns the correct `serverInfo`, matching the protocol version the official MCP Inspector expects
  2. Every tool exposed by the stdio server (`list_components`, `get_component`, `search_components`, `get_install_command`, `scaffold_route_handler`, `scaffold_provider`, `get_byos_config`, `get_quickstart`, `search_docs`, `get_doc`, `list_docs`) works identically over HTTP — same arguments, same JSON response shape
  3. A single `packages/mcp-core` package is the authoritative source for the component catalog, scaffolds, and docs index; both `packages/mcp` (stdio) and the new `apps/api` endpoint depend on it; no duplicated catalog or scaffold logic exists anywhere in the repo
  4. `docker compose -f docker-compose.prod.yml up` keeps the same service list (no new container) and the MCP endpoint is reachable on the existing `api` service network
  5. The MCP Inspector (`npx @modelcontextprotocol/inspector`) pointed at the deployed URL lists all 11 tools, calls `list_components` successfully, and calls `get_doc` successfully — no 500s, no protocol errors
  6. CORS headers allow POST from `https://chat.openai.com`, `https://claude.ai`, and `https://smithery.ai` (or `Access-Control-Allow-Origin: *` with read-only stance justified in code comment)
  7. `apps/docs/content/docs/guides/mcp.mdx` has a dedicated "Remote MCP" section documenting the HTTP URL and showing how to connect Claude.ai / ChatGPT / Smithery
  8. No authentication required (read-only tools mirror the public stdio server); any future auth-gated "premium" tools must be added in a separate phase and cannot regress the public endpoint
**Plans:** 1/1 plans complete

Plans:
- [x] 11-01-PLAN.md — mcp-core extraction + Streamable HTTP endpoint in apps/api + CORS + health + docs + changeset

### Phase 12: `create-uploadkit-app` CLI
**Goal**: A `npx create-uploadkit-app <name>` command scaffolds a runnable app in <60 seconds across 4 templates (Next.js, SvelteKit, Remix, Vite). Every scaffolded project has working uploads out of the box with a placeholder API key and clear next-steps.
**Depends on**: Phase 4 (SDK), Phase 5 (React components)
**Requirements**: GROW-01, GROW-02, GROW-03
**Success Criteria**:
  1. `npx create-uploadkit-app my-app` completes in <60s and produces a runnable project
  2. 4 templates published: `next`, `sveltekit`, `remix`, `vite` — each renders a working upload UI
  3. Interactive prompts: project name, template, package manager (pnpm/npm/yarn/bun auto-detected), TypeScript yes/no
  4. `.env.local` scaffolded with `UPLOADKIT_API_KEY=uk_test_placeholder` + link to signup
  5. Published to npm as `create-uploadkit-app`, reachable via all 4 package-manager "create" shortcuts
  6. README generated per template with dev/build commands and a "Next steps" section

### Phase 12.5: `uploadkit` CLI for existing projects (INSERTED)
**Goal**: Developers with an existing app can run `npx uploadkit init` and have UploadKit fully wired in <60s — deps installed, route handler created, provider mounted in their layout, env vars scaffolded. `npx uploadkit add <component>` then drops individual components shadcn-style. This is the **primary user role** — most installs are into existing projects, not greenfield.
**Depends on**: Phase 4 (SDK), Phase 5 (React components), Phase 12 (shared CLI infra reuse)
**Requirements**: GROW-15, GROW-16, GROW-17
**Success Criteria**:
  1. `npx uploadkit init` detects the framework (Next.js / SvelteKit / Remix / Vite) by inspecting `package.json` and project structure; refuses gracefully on unsupported stacks with a clear message
  2. `init` installs `@uploadkitdev/*` packages with the project's package manager (auto-detected), creates the framework-appropriate route handler, mounts the provider in the root layout/entry, writes `.env.local` (or merges into existing) with `UPLOADKIT_API_KEY=uk_test_placeholder`
  3. `init` is idempotent — running twice doesn't duplicate imports, route handlers, or provider mounts; emits "already configured" notice instead
  4. `npx uploadkit add <component>` (e.g. `add dropzone`) inserts the component import + usage into a user-selected page, with prompts to pick the target file
  5. Backup-on-modify: any file the CLI edits is backed up to `.uploadkit-backup/` before write; user can `uploadkit restore` if anything goes sideways
  6. Published as `uploadkit` (or `@uploadkitdev/cli`) with the same Changesets + smoke CI gate as Phase 12
  7. Docs page `/docs/cli` documents both `init` and `add` flows with framework-specific examples

**Plans:** 3/11 plans executed
- [x] 12.5-01-PLAN.md — Package skeleton + subcommand router
- [x] 12.5-02-PLAN.md — Framework detector (Next App/Pages, SvelteKit, Remix, Vite+React)
- [x] 12.5-03-PLAN.md — Codemod utilities (magicast) + backup/manifest pipeline
- [ ] 12.5-04-PLAN.md — `init` for Next.js App Router (reference implementation)
- [ ] 12.5-05-PLAN.md — `init` for SvelteKit, Remix, Vite+React
- [ ] 12.5-06-PLAN.md — `add` subcommand (6 React component aliases)
- [ ] 12.5-07-PLAN.md — `restore` subcommand (roll back backups)
- [ ] 12.5-08-PLAN.md — Fixture-driven e2e tests (all frameworks + add/restore)
- [ ] 12.5-09-PLAN.md — CI smoke matrix (scaffold real starters, run init, typecheck+build)
- [ ] 12.5-10-PLAN.md — Publish prep: Changeset, README, docs guide, release gate

### Phase 13: Interactive Playgrounds
**Goal**: Developers can try every headline UploadKit component without installing anything. 4 embeddable playgrounds (StackBlitz SDK + CodeSandbox sandbox) covering Dropzone, Cropper, UploadQueue, BYOS config — linked from blog posts, docs, and the landing.
**Depends on**: Phase 5 (SDK components), Phase 8 (landing)
**Requirements**: GROW-04, GROW-05
**Success Criteria**:
  1. 4 playground templates committed to `apps/playgrounds/` as independent Vite apps
  2. Each playground is embeddable via StackBlitz SDK and duplicated as a CodeSandbox template
  3. Landing and docs have a "Try it live" button next to relevant components that opens the playground inline
  4. Every blog tutorial that mentions a component has a "Try it now" link
  5. Playgrounds work without an API key (BYOS demo uses a mock, managed demo uses a public sandbox project)

### Phase 14: AI Generator Integrations
**Goal**: When a developer uses Cursor, Windsurf, Zed, v0.dev, bolt.new, or Lovable, UploadKit is either already on the radar (via MDC rules / awesome lists / llms.txt) or easily added. This phase wires UploadKit into every AI-assisted dev workflow.
**Depends on**: Phase 11 (MCP), Phase 9 (docs)
**Requirements**: GROW-06, GROW-07, GROW-08
**Success Criteria**:
  1. `.cursorrules` / `.cursor/rules/*.mdc` file published in a public `uploadkit-rules` repo and added to `awesome-cursorrules`
  2. `llms.txt` and `llms-full.txt` live at `uploadkit.dev/llms.txt`, listing SDK surface, component catalog, and install commands per LLM conventions
  3. PRs or issues opened against v0.dev, bolt.new, and Lovable requesting UploadKit as a component option (even if rejected, creates a link + discoverability)
  4. Documented "install in your IDE" flow for Cursor, Windsurf, and Zed in `docs/guides/mcp.mdx`
  5. Twitter/LinkedIn thread showing Claude Code generating an UploadKit upload flow end-to-end via MCP (viral-bait demo)

### Phase 15: Programmatic SEO — Framework Landing Pages
**Goal**: 20 SEO-optimized pages at `/uploads/<framework>` covering every major JS framework. Each page is specific enough to outrank generic tutorials for the long-tail keyword "file upload <framework>".
**Depends on**: Phase 8 (landing), Phase 9 (docs)
**Requirements**: GROW-09, GROW-10, GROW-11
**Success Criteria**:
  1. 20 pages live: Next.js, SvelteKit, Remix, React Router v7, Nuxt, Astro, RedwoodJS, SolidStart, Qwik, Gatsby, Vue, Angular, TanStack Start, Waku, HonoX, Hono, Express, Fastify, Vite+React, Vite+Vue
  2. Each page has: framework-specific hero, real runnable code snippet, presigned URL walkthrough, CTA to signup or docs
  3. Pages follow a shared template but have ≥60% unique prose (not boilerplate) to avoid duplicate-content penalties
  4. Sitemap updated to include all 20 routes; each has unique title/description/OG image
  5. Build time for adding a new framework page is <30 min (template + content file)
  6. Core Web Vitals green on all 20 pages (Lighthouse ≥90 performance)

### Phase 16: Free Developer Tools
**Goal**: 3 free client-side tools at `/tools/` that rank for high-intent keywords and funnel users to UploadKit. No login, no rate limits — pure SEO bait with real utility.
**Depends on**: Phase 8 (landing)
**Requirements**: GROW-12, GROW-13, GROW-14
**Success Criteria**:
  1. `/tools/mime-validator` — drag a file, see detected MIME + magic bytes + common spoofing warnings
  2. `/tools/presigned-url-generator` — form (bucket, key, method, expiry) → copy-pasteable curl command + JS snippet for S3/R2/B2
  3. `/tools/upload-cost-calculator` — inputs: GB stored, requests/mo, egress GB/mo → comparison table S3 vs R2 vs B2 vs UploadKit plans
  4. All 3 tools work fully client-side (zero backend calls)
  5. Each tool page has embedded CTA to signup with contextual copy
  6. Sitemap + Open Graph metadata per tool; targeted keyword in H1 + title


## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10

Note: Phase 8 (Landing & Pricing) depends on Phase 2 (Auth) rather than Phase 7, so it can be worked on in parallel with Phases 6-7 if desired. Phase 9 (Docs) can begin after Phase 4 in parallel with Phases 5-7.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Monorepo & Infrastructure | 4/4 | Complete   | 2026-04-07 |
| 2. Authentication | 2/2 | Complete   | 2026-04-08 |
| 3. Upload Flow & REST API | 4/4 | Complete   | 2026-04-08 |
| 4. SDK Core & Next.js Adapter | 2/2 | Complete   | 2026-04-08 |
| 5. SDK React Components | 4/4 | Complete   | 2026-04-08 |
| 6. Dashboard | 5/5 | Complete   | 2026-04-08 |
| 7. Billing & Email | 4/4 | Complete   | 2026-04-08 |
| 8. Landing & Pricing Pages | 3/3 | Complete   | 2026-04-08 |
| 9. Documentation | 3/4 | In Progress|  |
| 10. Testing, Publishing & Launch | 4/4 | Complete    | 2026-04-09 |
