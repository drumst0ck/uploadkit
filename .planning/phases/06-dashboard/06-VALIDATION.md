---
phase: 6
slug: dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 6 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Quick run command** | `pnpm turbo build --filter=@uploadkit/dashboard` |
| **Full suite command** | `pnpm turbo build test` |
| **Estimated runtime** | ~45 seconds |

## Wave 0 Requirements

- [ ] shadcn/ui initialized in packages/ui with ~13 components
- [ ] SWR + TanStack Table + Recharts + cmdk + next-themes installed in dashboard

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar collapse/expand | DASH-12 | Visual + interaction test | Toggle sidebar, verify icon-only rail, mobile drawer |
| File browser thumbnails | DASH-04 | Requires CDN images | Upload files, verify thumbnails in table |
| Chart rendering | DASH-08 | Visual chart verification | View usage page, verify Recharts area/bar charts |
| cmd+k palette | DASH-11 | Keyboard interaction | Press cmd+k, navigate with arrows, execute action |
| Responsive layout | DASH-13 | Multi-breakpoint visual | Test at 375px, 768px, 1024px, 1440px |

**Approval:** pending
