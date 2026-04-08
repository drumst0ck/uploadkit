# Phase 2: Authentication - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create accounts and sign in via three providers (GitHub OAuth, Google OAuth, email magic link), with database-backed sessions that persist across browser refresh. Only the dashboard app needs authentication — landing, pricing, and docs are public.

</domain>

<decisions>
## Implementation Decisions

### Auth Pages
- **D-01:** Single `/login` page with toggle between sign-in and sign-up modes ("Don't have an account? Sign up"). No separate `/register` page.
- **D-02:** Centered card layout on dark background — logo on top, auth form below. Vercel/Linear style.
- **D-03:** Social providers first (GitHub + Google buttons), divider ("or"), then email magic link input below. Social is the primary auth path.

### Session Strategy
- **D-04:** Database sessions stored in MongoDB (not JWT). Revocable, consistent with the Mongoose stack. Auth.js v5 with Mongoose adapter.
- **D-05:** Session duration: 30 days. Standard SaaS lifetime — users stay logged in for a month.

### Post-Auth Flow
- **D-06:** After first login, user lands on `/dashboard` (overview page). Empty state with "Create your first project" CTA if no projects exist.
- **D-07:** Auto-create a default project ("My First Project") on signup. User sees the dashboard with a project immediately — no empty project list.
- **D-08:** Only `/dashboard/*` routes are protected (require authentication). Landing page, pricing, docs are all public.

### Claude's Discretion
- Auth.js v5 configuration details (callbacks, pages config)
- Mongoose adapter setup for Auth.js
- Session/Account model mapping to existing `packages/db` models
- Middleware implementation for route protection
- Error handling for failed OAuth flows
- Magic link email template design

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specification
- `UPLOADKIT-GSD.md` §2.4 — API endpoints (POST /api/auth/[...nextauth])
- `UPLOADKIT-GSD.md` §4.1 — Dashboard pages (/login, /register, /dashboard)

### Stack Research
- `.planning/research/STACK.md` — Auth.js v5 install as `next-auth@beta` (not `@latest`), Mongoose adapter, Edge runtime constraints
- `.planning/research/PITFALLS.md` — Auth.js v5 middleware runs on Edge runtime; Mongoose requires Node.js runtime

### Prior Phase
- `.planning/phases/01-monorepo-infrastructure/01-CONTEXT.md` — D-02 (single root .env), D-10 (Coolify/Docker), D-12 (subdomain structure)

### Existing Code
- `packages/db/src/models/user.ts` — User model (already created in Phase 1)
- `packages/db/src/models/account.ts` — Account model (already created in Phase 1)
- `apps/dashboard/` — Dashboard app skeleton (Next.js 16, standalone output)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/db/src/models/user.ts` — User model with name, email, emailVerified, image fields
- `packages/db/src/models/account.ts` — Account model with OAuth fields (provider, providerAccountId, tokens)
- `packages/db/src/connection.ts` — Cached Mongoose connection (`connectDB()`)
- `packages/ui/` — shadcn/ui primitives (Button, Input available for auth form)

### Established Patterns
- Mongoose models follow the Phase 1 pattern (Schema + model export, `mongoose.models` hot-reload guard)
- All apps use `@uploadkit/config` for ESLint, TypeScript, Tailwind configs
- Single root `.env` for secrets — auth secrets (AUTH_SECRET, GITHUB_CLIENT_ID, etc.) go here

### Integration Points
- Auth.js route handler at `apps/dashboard/src/app/api/auth/[...nextauth]/route.ts`
- Middleware at `apps/dashboard/middleware.ts` for route protection
- Session context provider in dashboard layout
- Connection to existing MongoDB via `connectDB()` from `@uploadkit/db`

</code_context>

<specifics>
## Specific Ideas

- Research found Auth.js v5 installs via `next-auth@beta`, not `@latest` (which resolves to v4)
- Auth.js middleware runs on Edge runtime — cannot use Mongoose in middleware. Route protection must check session via `auth()` in server components or API routes, not middleware DB calls
- Auto-create default project on signup requires: Auth.js `signIn` event callback → create Project document → create default API key (`uk_test_` prefix)
- Email magic link requires Resend integration (already in requirements for Phase 7, but the transport needs to be set up here)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-authentication*
*Context gathered: 2026-04-08*
