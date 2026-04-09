---
phase: quick-260409-kyy
plan: 01
subsystem: examples
tags: [sdk, examples, nextjs, vite, express, documentation]
dependency_graph:
  requires: ["@uploadkit/core", "@uploadkit/react", "@uploadkit/next"]
  provides: ["examples/nextjs", "examples/vite-react", "examples/express-api"]
  affects: ["pnpm-workspace.yaml"]
tech_stack:
  added: []
  patterns:
    - "examples/nextjs: createUploadKitHandler catch-all route, NextSSRPlugin SSR hydration"
    - "examples/vite-react: createExpressHandler with Vite proxy, no apiKey in browser"
    - "examples/express-api: createUploadKit core client for server-side file management"
key_files:
  created:
    - examples/nextjs/package.json
    - examples/nextjs/tsconfig.json
    - examples/nextjs/next.config.ts
    - examples/nextjs/.env.local.example
    - examples/nextjs/README.md
    - examples/nextjs/src/app/layout.tsx
    - examples/nextjs/src/app/page.tsx
    - examples/nextjs/src/app/api/uploadkit/[...uploadkit]/core.ts
    - examples/nextjs/src/app/api/uploadkit/[...uploadkit]/route.ts
    - examples/vite-react/package.json
    - examples/vite-react/tsconfig.json
    - examples/vite-react/vite.config.ts
    - examples/vite-react/index.html
    - examples/vite-react/.env.example
    - examples/vite-react/README.md
    - examples/vite-react/server.ts
    - examples/vite-react/src/main.tsx
    - examples/vite-react/src/App.tsx
    - examples/express-api/package.json
    - examples/express-api/tsconfig.json
    - examples/express-api/.env.example
    - examples/express-api/README.md
    - examples/express-api/src/index.ts
  modified:
    - pnpm-workspace.yaml
decisions:
  - "examples use workspace:* for all @uploadkit/* deps — symlinked from local packages, no npm registry needed"
  - "vite-react example uses @uploadkit/next as a dependency (for createExpressHandler) not just @uploadkit/react"
metrics:
  duration: "8m"
  completed: "2026-04-09"
  tasks_completed: 3
  files_created: 24
---

# Quick Task 260409-kyy: Create 3 SDK Example Projects Summary

**One-liner:** Three self-contained example projects — Next.js App Router, Vite + React + Express, and Express-only — added to the pnpm workspace demonstrating full UploadKit SDK integration patterns.

## Files Created

**Total: 24 files created, 1 modified**

### examples/nextjs (10 files)
- `package.json` — `@uploadkit/example-nextjs`, runs on port 3010
- `tsconfig.json` — extends `../../packages/config/tsconfig.base.json`
- `next.config.ts` — transpilePackages for all @uploadkit/* SDK packages
- `.env.local.example` — placeholder `UPLOADKIT_API_KEY`
- `README.md` — 3-step setup
- `src/app/layout.tsx` — NextSSRPlugin + extractRouterConfig for SSR hydration
- `src/app/page.tsx` — `'use client'` component with all three upload components
- `src/app/api/uploadkit/[...uploadkit]/core.ts` — FileRouter with imageUploader + documentUploader
- `src/app/api/uploadkit/[...uploadkit]/route.ts` — exports `{ GET, POST }` from createUploadKitHandler

### examples/vite-react (9 files)
- `package.json` — `@uploadkit/example-vite`, concurrent Vite + Express dev
- `tsconfig.json` — standalone (no extends), jsx: react-jsx
- `vite.config.ts` — proxies `/api/uploadkit` to `http://localhost:3011`
- `index.html` — Vite entry point
- `.env.example` — placeholder API key
- `README.md` — 3-step setup with proxy explanation
- `server.ts` — Express 5 with createExpressHandler, avatar + attachment routes
- `src/main.tsx` — StrictMode + createRoot entry
- `src/App.tsx` — UploadKitProvider with endpoint="/api/uploadkit"

### examples/express-api (5 files)
- `package.json` — `@uploadkit/example-express`, tsx watch for dev
- `tsconfig.json` — CommonJS target for Node.js runtime
- `.env.example` — placeholder API key + optional UPLOADKIT_API_URL
- `README.md` — no-frontend example with curl usage examples
- `src/index.ts` — createUploadKit core client + createExpressHandler + list/delete endpoints

### pnpm-workspace.yaml (modified)
Added `- "examples/*"` glob alongside existing `apps/*` and `packages/*`.

## Key Patterns Per Example

| Example | Integration Pattern | Key APIs |
|---------|-------------------|----------|
| `examples/nextjs` | App Router catch-all route handler + SSR plugin | `createUploadKitHandler`, `NextSSRPlugin`, `extractRouterConfig` |
| `examples/vite-react` | Vite proxy + Express backend | `createExpressHandler`, `UploadKitProvider endpoint=` |
| `examples/express-api` | Server-side only (no frontend) | `createUploadKit`, `createExpressHandler`, `listFiles`, `deleteFile` |

## Security Patterns Demonstrated

- API key never in browser — all three examples keep `UPLOADKIT_API_KEY` server-side only
- `UploadKitProvider` receives `endpoint` (URL path), never an API key
- CORS in vite-react/server.ts restricted to localhost origins with comment to tighten in production
- All `.env.example` files use placeholder `uk_live_your_api_key_here` — no real keys committed

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — examples are intentionally minimal demo servers. The `middleware: async () => ({ uploadedBy: 'demo-user' })` pattern is explicitly documented as "add auth here in a real app" via inline comments, not a stub blocking the example's purpose.

## Threat Flags

None — no new network endpoints beyond what was planned. All API keys remain server-side per T-kyy-01, T-kyy-02 mitigations applied (CORS restricted to localhost).

## Self-Check: PASSED

- examples/nextjs/package.json: FOUND
- examples/nextjs/src/app/api/uploadkit/[...uploadkit]/route.ts: FOUND
- examples/vite-react/server.ts: FOUND
- examples/express-api/src/index.ts: FOUND
- pnpm-workspace.yaml contains "examples/*": FOUND
- Commits 336e24d, 5bc838f, fe15cbd: FOUND
