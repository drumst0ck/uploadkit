---
phase: 01-monorepo-infrastructure
plan: "04"
subsystem: infrastructure
tags: [docker, ci-cd, changesets, github-actions, devops]
dependency_graph:
  requires: ["01-02"]
  provides: ["docker-local-dev", "docker-production", "ci-pipeline", "changesets-versioning"]
  affects: ["all-apps", "sdk-packages"]
tech_stack:
  added:
    - "docker-compose (MongoDB 8, Redis 7-alpine, MinIO)"
    - "multi-stage Dockerfiles (node:22-alpine, 4-stage pattern)"
    - "GitHub Actions CI (pnpm/action-setup@v4, actions/cache@v4 for Turborepo)"
    - "changesets/action@v1 for automated release PRs and npm publish"
  patterns:
    - "Multi-stage Docker builds: base → deps → builder → runner"
    - "Non-root runner user (nodejs:nextjs uid 1001) per T-01-13"
    - "Standalone Next.js output for minimal production container"
    - "Turborepo filter builds (--filter={app}) for per-app Docker isolation"
    - "Changesets ignore list separates public SDK from private internal packages"
key_files:
  created:
    - docker-compose.yml
    - docker-compose.prod.yml
    - apps/api/Dockerfile
    - apps/dashboard/Dockerfile
    - apps/web/Dockerfile
    - apps/docs/Dockerfile
    - .github/workflows/ci.yml
    - .github/workflows/release.yml
    - .changeset/config.json
    - .changeset/README.md
  modified: []
decisions:
  - "Dockerfiles copy only package.json manifests in deps stage to maximize layer cache hits before full source COPY"
  - "Production containers run as nextjs (uid 1001) non-root user to satisfy T-01-13"
  - "Changeset ignore list includes all 8 private packages; only core/react/next are publishable"
  - "NPM_TOKEN only present in release.yml job (not CI), scoping secret exposure per T-01-14"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-04-07T22:23:55Z"
  tasks_completed: 2
  files_created: 10
  files_modified: 0
---

# Phase 01 Plan 04: Docker Infrastructure and CI/CD Summary

**One-liner:** Multi-stage Dockerfiles for all 4 Next.js apps with non-root runners, local dev compose (MongoDB+Redis+MinIO), production compose with Coolify subdomain labels, GitHub Actions CI with Turborepo caching, and Changesets automated SDK release flow.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Docker Compose files and multi-stage Dockerfiles | 8e75f60 | docker-compose.yml, docker-compose.prod.yml, 4x Dockerfiles |
| 2 | GitHub Actions CI/CD workflows and Changesets config | 6aa5dcd | .github/workflows/ci.yml, release.yml, .changeset/config.json, README.md |

## What Was Built

### Docker Local Development (`docker-compose.yml`)
- MongoDB 8 on port 27017 with persistent volume
- Redis 7-alpine on port 6379
- MinIO on ports 9000 (API) and 9001 (console) with persistent volume

### Docker Production (`docker-compose.prod.yml`)
- 4 app containers: api (3002), dashboard (3001), web (3000), docs (3003)
- Each container built from its app's Dockerfile with full monorepo context
- Coolify subdomain labels: `uploadkit.dev`, `app.uploadkit.dev`, `api.uploadkit.dev`, `docs.uploadkit.dev`
- `env_file: .env` for secrets injection (D-02)

### Multi-Stage Dockerfiles (all 4 apps)
- **Stage 1 (base):** `node:22-alpine` + `corepack enable pnpm`
- **Stage 2 (deps):** Copy package manifests, run `pnpm install --frozen-lockfile`
- **Stage 3 (builder):** Copy full source, run `pnpm turbo build --filter={app}`
- **Stage 4 (runner):** Minimal image, non-root user `nextjs` (uid 1001), standalone output only

### GitHub Actions CI (`ci.yml`)
- Triggers on push to main and PRs to main
- Uses `pnpm/action-setup@v4` with version 10, `actions/setup-node@v4` with node 22
- Turborepo cache via `actions/cache@v4` keyed by SHA with fallback
- Runs: `pnpm turbo lint` → `pnpm turbo typecheck` → `pnpm turbo build` → `pnpm turbo test`

### GitHub Actions Release (`release.yml`)
- `changesets/action@v1` creates version PRs on pending changesets
- Builds packages before publish (`pnpm turbo build`)
- Uses `NPM_TOKEN` from secrets for npm publish; `GITHUB_TOKEN` for PR creation
- `id-token: write` permission for npm provenance

### Changesets Configuration (`.changeset/config.json`)
- `"access": "public"` — SDK packages publish to npm publicly
- `"baseBranch": "main"` — base for changeset diff
- `"updateInternalDependencies": "patch"` — internal cross-package bumps
- `"ignore"`: all 8 private packages excluded from publish

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan creates infrastructure config files only (no UI or data stubs).

## Threat Flags

No new threat surface introduced beyond what the plan's threat model covers:
- T-01-13 mitigated: non-root user `nextjs` (uid 1001) in all Dockerfile runner stages
- T-01-14 mitigated: `NPM_TOKEN` only in release job; secrets never echoed to logs
- T-01-15 mitigated: `--frozen-lockfile` in all install steps; Changesets requires explicit intent

## Self-Check: PASSED

Files verified:
- docker-compose.yml: FOUND
- docker-compose.prod.yml: FOUND
- apps/api/Dockerfile: FOUND
- apps/dashboard/Dockerfile: FOUND
- apps/web/Dockerfile: FOUND
- apps/docs/Dockerfile: FOUND
- .github/workflows/ci.yml: FOUND
- .github/workflows/release.yml: FOUND
- .changeset/config.json: FOUND

Commits verified:
- 8e75f60: FOUND
- 6aa5dcd: FOUND
