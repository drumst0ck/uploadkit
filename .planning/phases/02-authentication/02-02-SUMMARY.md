---
phase: 02-authentication
plan: 02
subsystem: authentication-ui
tags: [auth, login-page, dashboard, session, oauth, magic-link, server-actions, tailwind-v4]
dependency_graph:
  requires:
    - apps/dashboard/auth.ts (signIn, signOut, auth exports — from Plan 01)
    - apps/dashboard/auth.config.ts (provider config — from Plan 01)
    - packages/db (connectDB, Project model)
  provides:
    - Custom login page with GitHub + Google OAuth + email magic link
    - Protected dashboard layout with session guard + sign-out
    - Dashboard overview page with project listing
    - Dark mode root layout
  affects:
    - apps/dashboard/src/app/login/page.tsx (new)
    - apps/dashboard/src/app/dashboard/layout.tsx (new)
    - apps/dashboard/src/app/dashboard/page.tsx (new)
    - apps/dashboard/src/app/layout.tsx (modified)
tech_stack:
  added: []
  patterns:
    - "Next.js server actions for social OAuth and magic link signIn() calls"
    - "export const dynamic = 'force-dynamic' on all auth-gated pages"
    - "Belt-and-suspenders auth guard: proxy.ts (Edge) + layout redirect (Node)"
    - "Initials fallback for missing user avatar"
    - "?mode=signup URL param for cosmetic sign-in/sign-up toggle"
key_files:
  created:
    - apps/dashboard/src/app/login/page.tsx
    - apps/dashboard/src/app/dashboard/layout.tsx
    - apps/dashboard/src/app/dashboard/page.tsx
  modified:
    - apps/dashboard/src/app/layout.tsx
decisions:
  - "export const dynamic = 'force-dynamic' required on all auth-gated pages — Next.js static prerendering fails when MONGODB_URI/AUTH_SECRET absent at build time"
  - "Server actions used for signIn/signOut — CSRF-safe by Next.js design (T-02-11)"
  - "Only user.id, user.name, user.email, user.image exposed from session in UI (T-02-10)"
metrics:
  duration: "2m"
  completed: "2026-04-08"
  tasks_completed: 2
  tasks_pending_human: 1
  files_created: 3
  files_modified: 1
---

# Phase 02 Plan 02: Authentication UI Summary

**One-liner:** Custom login page with GitHub/Google OAuth + Resend magic link, dark Vercel-aesthetic card UI, and protected dashboard layout with session-aware header and project listing.

## What Was Built

Two auto tasks completed, one human-verify checkpoint pending:

**Task 1 — Login Page (`apps/dashboard/src/app/login/page.tsx`):**
- 194-line Server Component page at `/login`
- Dark background (`#0a0a0b`) with centered card (`#141416`, `border-white/[0.06]`)
- Three server actions: `signInWithGitHub`, `signInWithGoogle`, `signInWithEmail` — each calls Auth.js `signIn()` with `redirectTo: '/dashboard'`
- Social providers first (GitHub + Google buttons with inline SVG icons, D-03), then "or" divider, then email magic link form
- Sign-in/sign-up mode toggle via `?mode=signup` search param (D-01) — cosmetic only, same `signIn()` call
- Auth.js error code mapping: OAuthSignin/OAuthCallback, EmailSignin, Verification → user-friendly messages
- Redirects already-authenticated users to `/dashboard` via `auth()` check
- WCAG AA: `sr-only` label on email input, `focus-visible` rings on all interactive elements, semantic `<main>`
- `export const dynamic = 'force-dynamic'` to prevent static prerendering

**Task 2 — Dashboard Layout + Root Layout + Overview Page:**

`apps/dashboard/src/app/layout.tsx`:
- Added `className="dark"` to `<html>`
- Added `className="bg-[#0a0a0b] text-zinc-50 antialiased"` to `<body>`

`apps/dashboard/src/app/dashboard/layout.tsx`:
- `auth()` session guard with `redirect('/login')` on missing session (D-08, belt-and-suspenders beyond proxy)
- `connectDB()` called before `auth()` for cold-start ordering safety
- Header: "UploadKit" brand (left), user avatar (or initials circle fallback) + email + sign-out form (right)
- Sign-out uses server action → CSRF-safe (T-02-11)
- `export const dynamic = 'force-dynamic'`

`apps/dashboard/src/app/dashboard/page.tsx`:
- Calls `auth()` + `Project.find({ userId: session.user.id })` for user-scoped project list
- Greeting: "Welcome, {name}" or "Welcome" if no name
- Project cards with name + slug (D-06)
- Empty state for edge case where D-07 auto-create hasn't fired
- `export const dynamic = 'force-dynamic'`

**Task 3 — Human Verification Checkpoint:** Pending. Build passes (`pnpm turbo build --filter=@uploadkit/dashboard` returns 3/3 tasks successful). User must test OAuth flow in browser per acceptance criteria.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added `export const dynamic = 'force-dynamic'` to all auth-gated pages**
- **Found during:** Task 2, dashboard build
- **Issue:** Next.js static prerendering tried to render `/dashboard` at build time — `connectDB()` threw `MongooseError: uri must be a string, got "undefined"` because `MONGODB_URI` is absent from the build environment
- **Fix:** Added `export const dynamic = 'force-dynamic'` to `dashboard/layout.tsx`, `dashboard/page.tsx`, and `login/page.tsx`. This is required for any page that reads session cookies or database at request time
- **Files modified:** All three new page/layout files
- **Commit:** `59fda0c`

## Known Stubs

- `dashboard/page.tsx` project list: shows name and slug only — no links, no delete/edit actions. These are intentional placeholders per the plan (Phase 6 adds full project CRUD UI). Data is real (from MongoDB), not hardcoded.
- Empty state CTA ("Create your first project") has no action attached — Phase 6 will wire this to a project creation flow.

## Threat Flags

No new threat surface introduced beyond the plan's threat model. All three STRIDE mitigations applied:
- T-02-09: Email input uses `type="email"` + HTML5 `required` + Auth.js Resend validates server-side
- T-02-10: Only `user.id`, `user.name`, `user.email`, `user.image` exposed from session — no tokens
- T-02-11: `signOut()` called from server action — CSRF-safe by Next.js design

## Self-Check: PASSED

Files created/modified:
- [x] `apps/dashboard/src/app/login/page.tsx` — exists, 197 lines
- [x] `apps/dashboard/src/app/dashboard/layout.tsx` — exists
- [x] `apps/dashboard/src/app/dashboard/page.tsx` — exists
- [x] `apps/dashboard/src/app/layout.tsx` — modified with dark class

Commits:
- [x] `07222c0` — feat(02-02): create login page
- [x] `59fda0c` — feat(02-02): create protected dashboard layout and overview page

Build: `pnpm turbo build --filter=@uploadkit/dashboard` → 3/3 successful, `/dashboard` and `/login` render as `ƒ` (dynamic).
