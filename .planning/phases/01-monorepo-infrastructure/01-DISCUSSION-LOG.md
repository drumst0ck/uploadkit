# Phase 1: Monorepo & Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 01-monorepo-infrastructure
**Areas discussed:** Dev environment, Package boundaries, R2 + CDN setup, Deploy target

---

## Dev Environment

### MongoDB local strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Atlas only (Recommended) | Free M0 cluster for dev. No Docker needed, same behavior as prod. | |
| Docker Compose | Local MongoDB in Docker. Works offline, faster queries. | ✓ |
| Both options | Document both, let each dev choose. | |

**User's choice:** Docker Compose
**Notes:** User prefers local Docker setup for development.

### Env vars management

| Option | Description | Selected |
|--------|-------------|----------|
| Root .env only | Single .env at repo root. All apps read from it. | ✓ |
| Per-app .env | Each app has its own .env.local. | |
| Root + per-app | Shared vars in root, app-specific overrides per app. | |

**User's choice:** Root .env only
**Notes:** One source of truth, simplest approach.

### Seed data

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, basic seed | Script creates test user, project, API key, sample files. | ✓ |
| No, defer to later | Each phase seeds what it needs. | |

**User's choice:** Yes, basic seed

---

## Package Boundaries

### packages/shared contents

| Option | Description | Selected |
|--------|-------------|----------|
| Types + utils + constants | TypeScript types, utility functions, shared constants | ✓ |
| Types only | Only shared TypeScript types/interfaces | |
| You decide | Claude picks | |

**User's choice:** Types + utils + constants

### packages/ui scope

| Option | Description | Selected |
|--------|-------------|----------|
| ui = shadcn base | Primitives only (Button, Input, Dialog). Dashboard composes. | ✓ |
| ui = full kit | Both primitives and composed components shared across apps. | |
| You decide | Claude structures the component library. | |

**User's choice:** ui = shadcn base

### packages/config scope

| Option | Description | Selected |
|--------|-------------|----------|
| ESLint + TS + Tailwind | All three shared configs centralized. | ✓ |
| ESLint + TS only | Tailwind stays per-app. | |
| You decide | Claude determines. | |

**User's choice:** ESLint + TS + Tailwind

---

## R2 + CDN Setup

### R2 bucket strategy

| Option | Description | Selected |
|--------|-------------|----------|
| One per env | uploadkit-dev and uploadkit-prod. Separate billing. | ✓ |
| Single bucket | One bucket with path prefixes (dev/, prod/). | |
| You decide | Claude picks. | |

**User's choice:** One per env

### CDN domain strategy

| Option | Description | Selected |
|--------|-------------|----------|
| cdn.uploadkit.dev | Single CDN domain for prod. Dev uses R2 direct URLs. | ✓ |
| cdn + dev-cdn | Separate CDN domains for prod and dev. | |
| You decide | Claude picks. | |

**User's choice:** cdn.uploadkit.dev (prod only)

### R2 key path structure

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, as spec'd | {projectId}/{fileRouterId}/{uuid}/{filename} | ✓ |
| Simpler paths | {projectId}/{uuid}/{filename} | |

**User's choice:** Yes, as spec'd

---

## Deploy Target

### Deploy platform

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel (Recommended) | All Next.js apps on Vercel. | |
| Coolify/Docker | Self-hosted. More control, fixed cost. | ✓ |
| Vercel + Coolify | Split: landing on Vercel, dashboard on Coolify. | |

**User's choice:** Coolify/Docker

### Deploy structure

| Option | Description | Selected |
|--------|-------------|----------|
| Per-app (Recommended) | Each app is a separate project. Independent deploys. | |
| Unified | Single config deploying all apps together. | ✓ |

**User's choice:** Unified

### Domain structure

| Option | Description | Selected |
|--------|-------------|----------|
| Subdomains | uploadkit.dev, app.uploadkit.dev, docs.uploadkit.dev | ✓ |
| Paths | uploadkit.dev, uploadkit.dev/dashboard, uploadkit.dev/docs | |
| You decide | Claude picks. | |

**User's choice:** Subdomains

### Dockerfiles in Phase 1

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, in Phase 1 | Multi-stage Dockerfiles + docker-compose.yml | ✓ |
| Defer Dockerfiles | Focus on code structure, Dockerfiles later. | |
| You decide | Claude determines timing. | |

**User's choice:** Yes, in Phase 1

---

## Claude's Discretion

- Turborepo pipeline configuration
- pnpm workspace protocol setup
- ESLint rule selection
- Sentry project/DSN configuration
- GitHub Actions workflow structure
- Upstash Redis connection setup

## Deferred Ideas

None
