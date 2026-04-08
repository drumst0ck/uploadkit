# Phase 2: Authentication - Research

**Researched:** 2026-04-07
**Domain:** Auth.js v5 (next-auth@beta) — OAuth (GitHub + Google) + Email Magic Link + Database Sessions + Next.js 16 proxy
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Single `/login` page with toggle between sign-in and sign-up modes. No separate `/register` page.
- **D-02:** Centered card layout on dark background — logo on top, auth form below. Vercel/Linear style.
- **D-03:** Social providers first (GitHub + Google buttons), divider ("or"), then email magic link input below. Social is the primary auth path.
- **D-04:** Database sessions stored in MongoDB (not JWT). Revocable, consistent with the Mongoose stack. Auth.js v5 with Mongoose adapter.
- **D-05:** Session duration: 30 days. Standard SaaS lifetime — users stay logged in for a month.
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

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign up and log in with GitHub OAuth | GitHub provider setup, OAuth callback URL pattern, `AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET` env vars |
| AUTH-02 | User can sign up and log in with Google OAuth | Google provider setup, `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` env vars, refresh token caveat |
| AUTH-03 | User can sign up and log in with email magic link | Resend provider setup, `AUTH_RESEND_KEY` env var, VerificationToken collection needed |
| AUTH-04 | User session persists across browser refresh | Database session strategy (not JWT), `maxAge: 2592000` (30 days), Session collection in MongoDB |
</phase_requirements>

---

## Summary

Auth.js v5 (`next-auth@beta`, currently `5.0.0-beta.30`) is the correct library for this phase. Despite the "beta" label it is production-stable and the only version with proper Next.js App Router support. The library exposes a single `auth()` export that works in server components, route handlers, and proxy (middleware).

The most important architectural constraint in this phase is the **Edge Runtime split**: Next.js 16 renamed `middleware.ts` to `proxy.ts`, and this proxy file runs on the Edge runtime. Mongoose uses TCP sockets and cannot run on Edge. The solution is a two-file configuration pattern: `auth.config.ts` (no adapter, safe for Edge) and `auth.ts` (full adapter + database session strategy, for server components and route handlers). The proxy imports only from `auth.config.ts`.

The MongoDB adapter for Auth.js is `@auth/mongodb-adapter` (not a Mongoose adapter — this package does not exist officially). The adapter requires a raw `MongoClient`. The critical insight is that Mongoose exposes the underlying MongoClient via `mongoose.connection.getClient()`, allowing the adapter to share the existing Mongoose connection pool without opening a second connection to MongoDB.

**Primary recommendation:** Use `@auth/mongodb-adapter` + `mongoose.connection.getClient()` to bridge the Auth.js MongoDB adapter to the existing Mongoose connection. Auto-create the default project in the `events.createUser` callback.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-auth | 5.0.0-beta.30 | Auth engine — OAuth, magic link, sessions | Only v5 supports App Router, Next.js 16 proxy, single `auth()` export. Must install as `next-auth@beta` — `@latest` resolves to v4. |
| @auth/mongodb-adapter | 3.11.1 | Persist sessions + accounts to MongoDB | Official Auth.js adapter. Uses raw MongoClient. Required for database session strategy (D-04). |
| mongodb | (peer of adapter) | MongoClient for adapter | Adapter uses native driver, not Mongoose. Extract client from existing Mongoose connection. |
| resend | 6.10.0 | Email transport for magic links | Official Auth.js email provider integration. Same team as React Email. |
| nodemailer | 8.0.5 | Peer dependency of next-auth for email | Required peer dependency when using Resend email provider in next-auth@beta. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | latest | Generate unique project slugs | Used in `events.createUser` callback to generate slug for "My First Project". |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @auth/mongodb-adapter | Third-party @brendon1555/authjs-mongoose-adapter | Community adapter; Auth.js team does not maintain it. Cannot support Next.js proxy with Mongoose until Mongoose supports Edge Runtime — not a real advantage. Official adapter + `getClient()` is the correct approach. |
| Database sessions | JWT sessions | JWT sessions avoid DB round-trips but cannot be revoked server-side. D-04 locks database sessions. |

**Installation (in `apps/dashboard`):**

```bash
pnpm add next-auth@beta @auth/mongodb-adapter nodemailer resend
```

**Version verification:** [VERIFIED: npm registry — `npm view next-auth@beta version`] → `5.0.0-beta.30`

---

## Architecture Patterns

### Recommended File Structure

```
apps/dashboard/
├── auth.config.ts            # Edge-safe config (no adapter, no DB imports)
├── auth.ts                   # Full config with adapter + DB session strategy
├── proxy.ts                  # Next.js 16 proxy (replaces middleware.ts)
├── src/
│   └── app/
│       ├── api/
│       │   └── auth/
│       │       └── [...nextauth]/
│       │           └── route.ts  # Auth.js route handler
│       ├── login/
│       │   └── page.tsx      # Custom sign-in page (D-01, D-02, D-03)
│       └── dashboard/
│           └── layout.tsx    # Session provider + protected layout
packages/
└── db/
    └── src/
        └── auth-client.ts    # Exports MongoClient derived from Mongoose connection
```

### Pattern 1: Two-File Auth Config (Edge Split)

**What:** Split Auth.js config into an Edge-safe base config and a full server config.
**When to use:** Always when using a database adapter + Next.js proxy (Edge runtime).

```typescript
// auth.config.ts — Edge-safe, no DB imports
// Source: https://authjs.dev/guides/edge-compatibility
import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) return isLoggedIn; // redirect to /login if not logged in
      return true; // public routes always accessible
    },
  },
  providers: [
    GitHub,
    Google,
    Resend({ from: 'UploadKit <noreply@uploadkit.dev>' }),
  ],
} satisfies NextAuthConfig;
```

```typescript
// auth.ts — Full server config with adapter
// Source: https://authjs.dev/getting-started/installation
import NextAuth from 'next-auth';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { authConfig } from './auth.config';
import { getAuthMongoClient } from '@uploadkit/db';
import { connectDB } from '@uploadkit/db';
import { Project } from '@uploadkit/db';
import { nanoid } from 'nanoid';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(getAuthMongoClient()),
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days (D-05)
    updateAge: 24 * 60 * 60,   // refresh once per day
  },
  events: {
    async createUser({ user }) {
      // D-07: auto-create "My First Project" on first signup
      await connectDB();
      const slug = `my-first-project-${nanoid(6)}`;
      await Project.create({
        name: 'My First Project',
        slug,
        userId: user.id,
      });
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async redirect({ url, baseUrl }) {
      // D-06: after login, land on /dashboard
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/dashboard`;
    },
  },
});
```

### Pattern 2: MongoClient from Mongoose Connection

**What:** Extract the native MongoClient from the existing Mongoose connection to share the connection pool with `@auth/mongodb-adapter`.
**When to use:** Always — avoids opening a second MongoDB connection.

```typescript
// packages/db/src/auth-client.ts
// Source: https://mongoosejs.com/docs/api/connection.html (getClient() confirmed)
import mongoose from 'mongoose';
import { connectDB } from './connection';
import type { MongoClient } from 'mongodb';

let client: MongoClient | null = null;

export function getAuthMongoClient(): MongoClient {
  // Return cached client if connection is already established
  if (mongoose.connection.readyState === 1 && !client) {
    client = mongoose.connection.getClient() as MongoClient;
  }
  if (!client) {
    throw new Error(
      'getAuthMongoClient() called before connectDB(). Call connectDB() first.'
    );
  }
  return client;
}

// Async version for use in auth.ts where we can await
export async function getAuthMongoClientAsync(): Promise<MongoClient> {
  await connectDB();
  return mongoose.connection.getClient() as MongoClient;
}
```

**Important:** `@auth/mongodb-adapter` requires a connected client. The auth.ts file must ensure `connectDB()` is called before the adapter is initialized, or use the async factory pattern.

### Pattern 3: Next.js 16 Proxy (Route Protection)

**What:** `proxy.ts` at the project root intercepts all requests. For `/dashboard/*` routes, it checks for an auth session cookie. No DB calls happen here — pure Edge-safe JWT/cookie check.
**When to use:** Route protection for `/dashboard/*` (D-08).

```typescript
// proxy.ts (replaces middleware.ts in Next.js 16)
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Initialize Auth.js with Edge-safe config ONLY (no adapter)
export const { auth: proxy } = NextAuth(authConfig);

export const config = {
  matcher: [
    // Protect all /dashboard routes
    '/dashboard/:path*',
    // Exclude static assets and API routes
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### Pattern 4: Auth.js Route Handler

```typescript
// apps/dashboard/src/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/auth'; // imports from full auth.ts
export const { GET, POST } = handlers;
```

### Pattern 5: Custom Login Page

```typescript
// apps/dashboard/src/app/login/page.tsx
import { signIn } from '@/auth';

// D-01: Single /login page, D-02: centered card, D-03: social first then email
export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
      <div className="w-full max-w-[400px] rounded-xl border border-white/[0.06] bg-[#141416] p-8">
        {/* Logo */}
        {/* GitHub button — form action calls signIn('github') */}
        {/* Google button — form action calls signIn('google') */}
        {/* Divider */}
        {/* Email magic link input — form action calls signIn('resend', { email }) */}
      </div>
    </main>
  );
}
```

**Server actions for OAuth providers:**
```typescript
// Using React Server Actions for form submissions
async function signInWithGitHub() {
  'use server';
  await signIn('github', { redirectTo: '/dashboard' });
}
```

### Pattern 6: Session in Server Components

```typescript
// Access session in any server component (D-06, D-08)
import { auth } from '@/auth'; // full auth.ts

export default async function DashboardLayout({ children }) {
  const session = await auth();
  if (!session) redirect('/login'); // belt-and-suspenders beyond proxy
  return <>{children}</>;
}
```

### Anti-Patterns to Avoid

- **Importing from `auth.ts` in `proxy.ts`:** This brings the MongoDB adapter into the Edge runtime → crashes. Always use `auth.config.ts` in `proxy.ts`.
- **Using `middleware.ts` filename:** Next.js 16 renamed this to `proxy.ts`. The codemod exists: `npx @next/codemod@latest middleware-to-proxy`.
- **Calling `mongoose.connect()` in proxy/Edge code:** Mongoose requires Node.js TCP sockets. Any import chain that touches Mongoose in the proxy file will cause a build error.
- **Single-provider for the adapter:** Do not create a separate MongoClient connection just for Auth.js — extract it from the existing Mongoose connection via `getClient()`.
- **JWT strategy with database adapter:** Using `strategy: 'database'` (D-04) requires the adapter. Do not set `strategy: 'jwt'` in `auth.ts` — that would defeat session revocability and ignore the adapter for session storage.
- **Passing `redirectTo` that goes to an external URL:** Auth.js v5 `signIn()` `redirectTo` must be a relative path or same-origin URL to prevent open redirect vulnerabilities.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth flow (PKCE, state, callback) | Custom GitHub/Google OAuth implementation | Auth.js providers | OAuth has subtle security requirements (state parameter CSRF protection, PKCE for public clients, token refresh). Hand-rolling misses edge cases. |
| Session token generation & storage | Custom session table + cookie | Auth.js database session strategy | Token rotation, secure cookie flags (HttpOnly, SameSite, Secure), expiry management — all handled. |
| Email magic link token + expiry | Custom VerificationToken model + email send | Auth.js Resend provider | Tokens must be hashed, single-use, time-limited. Auth.js handles generation, storage, and invalidation after use. |
| CSRF protection | Custom CSRF token in forms | Auth.js built-in CSRF protection | Auth.js v5 uses signed server actions for form-based sign-in — CSRF is handled automatically. |
| Password hashing | bcrypt implementation | (not needed — no passwords in this phase) | No credentials provider in scope. OAuth + magic link only. |

**Key insight:** Auth.js v5's value is not just "less code" — it's correct security defaults that are easy to break in custom implementations (token leakage, replay attacks, insecure redirects).

---

## Common Pitfalls

### Pitfall 1: `@auth/mongodb-adapter` Requires a Connected MongoClient

**What goes wrong:** The adapter is initialized at module load time. If `getAuthMongoClient()` is called before `connectDB()` has resolved, the client object is null and all auth operations fail silently or throw.

**Why it happens:** Next.js module initialization order is not guaranteed. The adapter factory runs when `auth.ts` is first imported — possibly before any route handler has called `connectDB()`.

**How to avoid:** Use `getAuthMongoClientAsync()` in `auth.ts` so the `connectDB()` await completes before the adapter initializes. Alternatively, structure `auth.ts` as a lazy singleton:

```typescript
// Lazy initialization: connectDB before adapter
let authInstance: ReturnType<typeof NextAuth> | null = null;

export async function getAuth() {
  if (!authInstance) {
    await connectDB();
    authInstance = NextAuth({ ...authConfig, adapter: MongoDBAdapter(mongoose.connection.getClient()) });
  }
  return authInstance;
}
```

**Warning signs:** `TypeError: Cannot read properties of null (reading 'db')` in Auth.js adapter operations.

---

### Pitfall 2: Importing `auth.ts` in `proxy.ts` Crashes the Edge Build

**What goes wrong:** `proxy.ts` imports from `auth.ts`, which imports `@auth/mongodb-adapter`, which imports `mongodb`, which tries to use Node.js `net` module → Edge build fails with "Module not found: Can't resolve 'net'".

**Why it happens:** The Edge runtime does not have Node.js built-in modules. Any transitive dependency on `net`, `tls`, `dns`, or `fs` breaks Edge.

**How to avoid:** `proxy.ts` must **only** import from `auth.config.ts` (which has no adapter import). Never import from `auth.ts` in `proxy.ts`.

**Warning signs:** Build error mentioning `net`, `tls`, or `dns` in the proxy/middleware build step.

---

### Pitfall 3: Google Refresh Tokens Only Issued on First Login

**What goes wrong:** Google only provides a refresh token on the first OAuth authorization. Subsequent logins return `access_token` but no `refresh_token`. If the app stores and relies on refresh tokens (e.g., for Google Drive access in a future phase), it silently has null refresh tokens after the first login.

**Why it happens:** This is Google's OAuth behavior — they only issue refresh tokens when `prompt: "consent"` is used and the user hasn't previously authorized the app.

**How to avoid:** For this phase (session auth only), this is a non-issue — refresh tokens are not used for dashboard auth. Store the note for any future phase that needs Google API access on behalf of the user.

**Warning signs:** Not applicable for this phase.

---

### Pitfall 4: `events.createUser` Is Not Called on OAuth Re-Login

**What goes wrong:** `events.createUser` only fires when the user document is first created. Subsequent sign-ins (same provider, same email) go through `events.signIn` — not `createUser`. If the default project creation logic is put in `signIn` instead of `createUser`, it runs on every login and creates duplicate projects.

**Why it happens:** Auth.js has separate events: `createUser` (first registration) and `signIn` (every authentication). They are not the same.

**How to avoid:** Default project creation goes in `events.createUser` only. The event receives `{ user }` with the newly created user document including `user.id`. Use this ID to create the Project document.

**Warning signs:** Duplicate "My First Project" entries per user in the database.

---

### Pitfall 5: `proxy.ts` Matcher Blocking Static Assets

**What goes wrong:** An overly broad matcher in `proxy.ts` runs the auth check on `_next/static`, `_next/image`, and `favicon.ico`. These requests cannot have auth cookies and fail, causing slow page loads or infinite redirect loops.

**Why it happens:** The default `matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']` from the docs is correct but easy to get wrong when customizing for specific protected paths.

**How to avoid:** Use the exact matcher pattern recommended by Next.js docs:
```typescript
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```
Combined with the `authorized` callback in `auth.config.ts` that only enforces auth on `/dashboard` paths.

**Warning signs:** 500 errors on font loading, Next.js image optimization failures.

---

### Pitfall 6: `AUTH_SECRET` Not Set in Production

**What goes wrong:** Auth.js silently falls back to an insecure secret in development. In production with no `AUTH_SECRET`, session tokens are signed with a predictable value → session forgery.

**Why it happens:** The library does not throw on missing secret in dev. Developers forget to add it to the production environment before deploying.

**How to avoid:** Generate with `npx auth secret` which writes to `.env.local`. Add `AUTH_SECRET` to the production environment (Coolify env config or Docker secrets). Verify its presence at startup with a Zod env schema check.

**Warning signs:** Auth.js warning "No secret was provided" in logs. Any production session that can be reproduced locally.

---

### Pitfall 7: Resend Domain Not Verified → Magic Links Land in Spam

**What goes wrong:** Magic link emails are delivered to spam or rejected entirely because the sending domain `uploadkit.dev` hasn't been added to Resend with SPF/DKIM records.

**Why it happens:** Resend requires domain verification before sending from a custom address. Using `onboarding@resend.dev` works in dev but cannot be used in production.

**How to avoid:** Add `uploadkit.dev` domain to Resend dashboard and configure DNS records (SPF, DKIM) before testing magic link emails in production. Use `noreply@uploadkit.dev` as the from address in the Resend provider config.

**Warning signs:** Magic link emails not arriving; Resend dashboard showing delivery failures.

---

## Code Examples

### Environment Variables Required

```bash
# Root .env (D-01 from Phase 1 — single root .env)
AUTH_SECRET=<generate with: npx auth secret>
AUTH_GITHUB_ID=<from GitHub OAuth App>
AUTH_GITHUB_SECRET=<from GitHub OAuth App>
AUTH_GOOGLE_ID=<from Google Cloud Console>
AUTH_GOOGLE_SECRET=<from Google Cloud Console>
AUTH_RESEND_KEY=<from Resend Dashboard>
AUTH_URL=https://dashboard.uploadkit.dev  # production only
```

### GitHub OAuth App Callback URL

```
# For development:
http://localhost:3001/api/auth/callback/github

# For production:
https://dashboard.uploadkit.dev/api/auth/callback/github
```

### Google OAuth App Callback URL

```
# For development:
http://localhost:3001/api/auth/callback/google

# For production:
https://dashboard.uploadkit.dev/api/auth/callback/google
```

### Session Type Augmentation

Auth.js v5 session type must be augmented to expose `user.id` (the MongoDB `_id` as string):

```typescript
// Source: https://authjs.dev/getting-started/typescript
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}
```

Add this to `auth.ts` or a `types/next-auth.d.ts` file.

### Collections Created by `@auth/mongodb-adapter`

The adapter manages these MongoDB collections automatically:

| Collection | Purpose | Key fields |
|------------|---------|------------|
| `users` | User profiles | `name`, `email`, `emailVerified`, `image` |
| `accounts` | OAuth account links | `userId`, `provider`, `providerAccountId`, token fields |
| `sessions` | Active database sessions | `userId`, `sessionToken`, `expires` |
| `verification_tokens` | Magic link tokens | `identifier` (email), `token`, `expires` |

**Important:** The adapter creates `users` and `accounts` collections, which will coexist with the Mongoose `User` and `Account` models (same MongoDB database). The adapter and Mongoose operate on the same documents — the Mongoose models are the source of truth for application use; the adapter handles Auth.js-specific operations on the same collections.

**Conflict risk:** Mongoose `User` model uses lowercase field names matching the Auth.js spec (`name`, `email`, `emailVerified`, `image`) — confirmed compatible. Mongoose `Account` model field names (`userId`, `provider`, `providerAccountId`, token fields) also match the adapter spec — confirmed compatible. No schema migration needed.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts` | Next.js 16 | Must rename file. Codemod: `npx @next/codemod@latest middleware-to-proxy`. Same runtime (Edge), different file convention. |
| `authOptions` object (NextAuth v4) | Single `NextAuth()` call → `{ auth, handlers, signIn, signOut }` (Auth.js v5) | Auth.js v5 | No more `getServerSession(authOptions)`. Use `auth()` everywhere. |
| `getServerSession()` | `auth()` | Auth.js v5 | `auth()` is the unified session accessor for server components, route handlers, and proxy. |
| `pages/api/auth/[...nextauth].ts` | `app/api/auth/[...nextauth]/route.ts` | Auth.js v5 + App Router | Route handler pattern replaces Pages Router API. |
| `SessionProvider` from `next-auth/react` | Can still use, but often unnecessary | Auth.js v5 | Server components read sessions server-side. Client components that need session still use `SessionProvider` + `useSession`. |

**Deprecated/outdated:**

- `next-auth@latest` (resolves to v4): App Router not supported. `next-auth@beta` required.
- `@next-auth/mongodb-adapter`: Old package name, replaced by `@auth/mongodb-adapter`.
- Third-party Mongoose adapters (e.g., `@brendon1555/authjs-mongoose-adapter`): Community-maintained, not official. The `mongoose.connection.getClient()` bridge to the official adapter is the correct approach.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `mongoose.connection.getClient()` returns a compatible `MongoClient` that `@auth/mongodb-adapter` accepts without type errors | Architecture Patterns — Pattern 2 | Would need a separate `mongodb` `MongoClient` connection; adds a second connection to Atlas. Low risk — verified via Mongoose docs that `getClient()` returns the native driver `MongoClient`. |
| A2 | `events.createUser` fires exactly once per user (on first OAuth or email sign-in, never on re-login) | Common Pitfalls — Pitfall 4 | If it fires on every login, duplicate "My First Project" records are created. Mitigation: add a `Project.findOne({ userId })` guard inside the event. |
| A3 | `proxy.ts` with only `auth.config.ts` (no adapter) successfully reads the Auth.js session cookie created by the database strategy | Architecture Patterns — Pattern 3 | If the proxy cannot read database-strategy session cookies without the adapter, route protection would require a different approach (e.g., checking cookie existence only, not validating it). |

---

## Open Questions

1. **`getAuthMongoClient()` timing — lazy vs. eager initialization**
   - What we know: The adapter needs a connected `MongoClient`. `connectDB()` is async.
   - What's unclear: Whether Next.js initializes `auth.ts` before any DB connection is available in the serverless cold-start path.
   - Recommendation: Make `auth.ts` lazily initialize the adapter via an async factory. Test with a cold-start scenario during implementation.

2. **Resend magic link email — custom template or default?**
   - What we know: The default Auth.js Resend template is functional but generic.
   - What's unclear: Whether a custom `sendVerificationRequest` function is worth building in this phase vs. deferring to Phase 7 (Email).
   - Recommendation: Use default Auth.js template in this phase. Phase 7 (Email) will implement the custom React Email template per EMAIL-01.

3. **Session cookie in subdomain context**
   - What we know: Dashboard is at `dashboard.uploadkit.dev` (Phase 1 subdomain structure).
   - What's unclear: Whether `AUTH_URL` needs explicit configuration for the cookie domain to work correctly with the subdomain.
   - Recommendation: Set `AUTH_URL=https://dashboard.uploadkit.dev` in production env. Auth.js v5 uses `AUTH_URL` to scope cookies correctly.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Auth.js server config, Mongoose | ✓ | 22 LTS | — |
| pnpm | Package installation | ✓ | 9.x | — |
| next-auth@beta | Auth engine | — (not installed yet) | 5.0.0-beta.30 | — |
| @auth/mongodb-adapter | Database sessions | — (not installed yet) | 3.11.1 | — |
| resend | Magic link email | — (not installed yet) | 6.10.0 | — |
| MongoDB Atlas | Session/user storage | ✓ (Phase 1 configured) | Atlas M10 | — |
| Resend account + domain | Email delivery | ✗ (needs setup) | — | Use AUTH_SECRET token log in dev mode (Auth.js logs magic link to console when no email provider is configured — [ASSUMED]) |

**Missing dependencies with no fallback:**

- `next-auth@beta`, `@auth/mongodb-adapter`, `nodemailer`, `resend` — must be installed in Wave 1 of the plan.

**Missing dependencies with fallback:**

- Resend domain verification: In development, magic link URLs are logged to console by Auth.js — allows testing without email delivery.
- GitHub/Google OAuth app credentials: In development, these can be left as placeholder values; only OAuth flows will fail, not the app startup.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` (project root — to be created in Wave 0 if not present) |
| Quick run command | `pnpm vitest run --reporter=verbose` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | GitHub OAuth callback creates/finds user and redirects to /dashboard | E2E (Playwright) | `pnpm playwright test auth/github.spec.ts` | ❌ Wave 0 |
| AUTH-02 | Google OAuth callback creates/finds user and redirects to /dashboard | E2E (Playwright) | `pnpm playwright test auth/google.spec.ts` | ❌ Wave 0 |
| AUTH-03 | Magic link email is sent and clicking it authenticates the user | E2E (Playwright) | `pnpm playwright test auth/magic-link.spec.ts` | ❌ Wave 0 |
| AUTH-04 | Session persists after browser reload (cookie survives, DB session valid) | E2E (Playwright) | `pnpm playwright test auth/session-persistence.spec.ts` | ❌ Wave 0 |
| D-07 | `events.createUser` creates one Project document with name "My First Project" | Unit | `pnpm vitest run packages/db/src/__tests__/auth-events.test.ts` | ❌ Wave 0 |
| D-08 | Unauthenticated request to /dashboard redirects to /login | Integration | `pnpm playwright test auth/route-protection.spec.ts` | ❌ Wave 0 |

**Note on OAuth E2E tests:** Full OAuth provider tests require valid credentials and a running browser. For CI, use Playwright's mock OAuth server or test with a dedicated test GitHub App. Magic link tests can use Auth.js's console log mode (no real email sending needed in CI).

### Sampling Rate

- **Per task commit:** `pnpm vitest run packages/db/src/__tests__/`
- **Per wave merge:** `pnpm vitest run && pnpm playwright test auth/`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `apps/dashboard/src/__tests__/` — directory for auth integration tests
- [ ] `packages/db/src/__tests__/auth-events.test.ts` — covers D-07 (createUser event → Project creation)
- [ ] `e2e/auth/` — Playwright E2E test directory for all AUTH-0x requirements
- [ ] `playwright.config.ts` — if not already configured at monorepo root

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Auth.js v5 OAuth + magic link — no passwords, so no password hashing/brute force concerns. Session tokens are cryptographically random. |
| V3 Session Management | Yes | Database sessions (`strategy: 'database'`), `maxAge: 30d`, `HttpOnly` + `SameSite=Lax` cookie flags set by Auth.js automatically. |
| V4 Access Control | Yes | proxy.ts `authorized` callback enforces `/dashboard/*` protection. Belt-and-suspenders: `auth()` in server components + `redirect()` if session missing. |
| V5 Input Validation | Yes | Email input for magic link — validate format before calling `signIn('resend', { email })`. Use Zod schema. |
| V6 Cryptography | No | No hand-rolled crypto in this phase. Auth.js handles token generation with `AUTH_SECRET`. |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Open redirect after OAuth callback | Tampering | Auth.js v5 validates `redirectTo` is same-origin. Never pass user-controlled redirect URLs to `signIn()`. |
| CSRF on sign-in form | Spoofing | Auth.js v5 uses React Server Actions for form-based sign-in — server action CSRF protection is built into Next.js. |
| Session fixation | Elevation of Privilege | Auth.js rotates session tokens on each sign-in. Database sessions are invalidated by deleting the Session document. |
| Magic link replay | Repudiation | Auth.js single-use tokens: `VerificationToken` is deleted after first use. Token expiry (default 24h) limits replay window. |
| Subdomain cookie leakage | Information Disclosure | Set `AUTH_URL=https://dashboard.uploadkit.dev` — Auth.js will scope the session cookie to the dashboard subdomain only, not `*.uploadkit.dev`. |

---

## Sources

### Primary (HIGH confidence)

- [authjs.dev/getting-started/installation](https://authjs.dev/getting-started/installation) — Auth.js v5 setup, exports, `AUTH_SECRET`
- [authjs.dev/guides/edge-compatibility](https://authjs.dev/guides/edge-compatibility) — Split config pattern, proxy usage
- [authjs.dev/getting-started/session-management/protecting](https://authjs.dev/getting-started/session-management/protecting) — `authorized` callback, proxy pattern, matcher config
- [authjs.dev/getting-started/providers/resend](https://authjs.dev/getting-started/providers/resend) — Resend email provider, `AUTH_RESEND_KEY`, `from` config
- [authjs.dev/getting-started/providers/github](https://authjs.dev/getting-started/providers/github) — GitHub provider, `AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET`, callback URL
- [authjs.dev/getting-started/providers/google](https://authjs.dev/getting-started/providers/google) — Google provider, `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`, refresh token caveat
- [authjs.dev/reference/core#authconfig](https://authjs.dev/reference/core#authconfig) — `events.createUser`, `session.maxAge`, `session.updateAge`, callbacks
- [mongoosejs.com/docs/api/connection.html](https://mongoosejs.com/docs/api/connection.html) — `connection.getClient()` confirmed as official API returning `MongoClient`
- [nextjs.org/docs/app/api-reference/file-conventions/proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) — `proxy.ts` file convention in Next.js 16
- npm registry — `next-auth@beta` version `5.0.0-beta.30` [VERIFIED]
- npm registry — `@auth/mongodb-adapter` version `3.11.1` [VERIFIED]
- npm registry — `resend` version `6.10.0` [VERIFIED]

### Secondary (MEDIUM confidence)

- [WebSearch: mongoose.connection.getClient() for @auth/mongodb-adapter](https://github.com/nextauthjs/next-auth/discussions/3633) — Community pattern confirmed: extract MongoClient from Mongoose connection with `getClient()`
- [authjs.dev/reference/adapter/mongodb](https://authjs.dev/reference/adapter/mongodb) — Collections created by adapter (users, accounts, sessions, verification_tokens)

### Tertiary (LOW confidence)

- Auth.js console-logging magic link URLs in development when no email transport is configured — [ASSUMED] based on general Auth.js behavior; confirm during implementation.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — npm registry verified all versions; official Auth.js docs consulted for all providers and adapter
- Architecture: HIGH — split config and proxy patterns from official authjs.dev edge compatibility guide; `getClient()` from official Mongoose API docs
- Session strategy: HIGH — `session.strategy: 'database'` and `maxAge` from official Auth.js core reference
- `events.createUser` pattern: MEDIUM — documented in Auth.js reference; single-fire behavior (not on re-login) confirmed via GitHub issues but not via official docs example
- Proxy.ts rename: HIGH — multiple official Next.js sources confirm the rename in v16

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (Auth.js v5 beta moves fast; re-verify if > 30 days before implementation)
