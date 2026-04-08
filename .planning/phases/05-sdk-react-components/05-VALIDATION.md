---
phase: 5
slug: sdk-react-components
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 5 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @testing-library/react |
| **Quick run command** | `pnpm vitest run packages/react/tests/ --reporter=verbose` |
| **Full suite command** | `pnpm turbo test` |
| **Estimated runtime** | ~25 seconds |

## Sampling Rate

- **After every task commit:** `pnpm vitest run packages/react/tests/ --reporter=verbose`
- **After every plan wave:** `pnpm turbo test`
- **Max feedback latency:** 25 seconds

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Premium visual quality | REACT-11 | Subjective design assessment | Open Storybook/playground, compare to Vercel/Linear design |
| Dark mode visual | REACT-09 | Requires visual inspection | Toggle data-theme, verify all components switch correctly |
| Canvas thumbnail | REACT-07 | Requires browser canvas API | Drop image file, verify thumbnail generates client-side |
| WCAG AA contrast | REACT-13 | Requires contrast checker tool | Run axe-core or manual contrast check on all states |

**Approval:** pending
