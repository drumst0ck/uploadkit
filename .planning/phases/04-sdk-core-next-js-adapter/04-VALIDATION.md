---
phase: 4
slug: sdk-core-next-js-adapter
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (root workspace) |
| **Quick run command** | `pnpm vitest run --reporter=verbose` |
| **Full suite command** | `pnpm turbo test` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run --reporter=verbose`
- **After every plan wave:** Run `pnpm turbo test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| (Populated after plans created) | | | | | | | |

---

## Wave 0 Requirements

- [ ] `packages/core/tests/` — test scaffolds for upload client, retry, abort
- [ ] `packages/next/tests/` — test scaffolds for handler, fileRouter types

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Upload to real R2 via SDK | SDK-02 | Requires R2 credentials | Configure env, run upload via createUploadKit client |
| BYOS mode with own S3 | SDK-05 | Requires dev's S3 bucket | Configure BYOS handler, test upload to own bucket |
| Type inference in consumer | NEXT-04 | Requires IDE to verify autocomplete | Open typed component, verify route name autocomplete |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity
- [ ] Wave 0 covers all MISSING references
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
