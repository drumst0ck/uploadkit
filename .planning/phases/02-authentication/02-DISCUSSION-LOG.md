# Phase 2: Authentication - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 02-authentication
**Areas discussed:** Auth pages, Session strategy, Post-auth flow

---

## Auth Pages

### Login/register structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single page + toggle | /login with toggle. Same form, different mode. | ✓ |
| Separate pages | /login and /register as distinct pages. | |
| You decide | Claude picks. | |

**User's choice:** Single page + toggle

### Visual style

| Option | Description | Selected |
|--------|-------------|----------|
| Centered card | Clean card on dark background. Logo on top. Vercel/Linear. | ✓ |
| Split layout | Left: branding. Right: form. Supabase/Clerk. | |
| You decide | Claude designs it. | |

**User's choice:** Centered card

### Provider presentation order

| Option | Description | Selected |
|--------|-------------|----------|
| Social first | GitHub + Google on top, divider, email below. | ✓ |
| Email first | Email input on top, social buttons below. | |
| You decide | Claude picks. | |

**User's choice:** Social first

---

## Session Strategy

### Session type

| Option | Description | Selected |
|--------|-------------|----------|
| Database sessions | Stored in MongoDB. Revocable. Auth.js default with Mongoose. | ✓ |
| JWT sessions | Stateless. No DB query per request. Harder to revoke. | |
| You decide | Claude picks. | |

**User's choice:** Database sessions

### Session duration

| Option | Description | Selected |
|--------|-------------|----------|
| 30 days | Standard SaaS. Month-long login. | ✓ |
| 7 days | More secure. Weekly re-login. | |
| You decide | Claude picks. | |

**User's choice:** 30 days

---

## Post-Auth Flow

### Landing page after login

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard overview | Go to /dashboard. Empty state if no projects. | ✓ |
| Onboarding wizard | Multi-step: project → API key → first upload. | |
| You decide | Claude picks simplest path. | |

**User's choice:** Dashboard overview

### Auto-create project on signup

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, auto-create | "My First Project" created automatically. | ✓ |
| No, user creates | User creates first project manually. | |
| You decide | Claude picks. | |

**User's choice:** Yes, auto-create

### Protected routes

| Option | Description | Selected |
|--------|-------------|----------|
| /dashboard/* only | Only dashboard needs auth. Landing, pricing, docs public. | ✓ |
| You decide | Claude determines. | |

**User's choice:** /dashboard/* only

---

## Claude's Discretion

- Auth.js v5 configuration details
- Mongoose adapter setup
- Session/Account model mapping
- Middleware implementation
- Error handling for failed OAuth
- Magic link email template design

## Deferred Ideas

None
