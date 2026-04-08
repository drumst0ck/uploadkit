---
phase: 3
slug: upload-flow-rest-api
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (root workspace) |
| **Quick run command** | `pnpm vitest run --reporter=verbose` |
| **Full suite command** | `pnpm turbo test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run --reporter=verbose`
- **After every plan wave:** Run `pnpm turbo test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| (Populated after plans created) | | | | | | | |

---

## Wave 0 Requirements

- [ ] `apps/api/package.json` — add @uploadkit/db, @uploadkit/shared, nanoid, @upstash/qstash
- [ ] Fix model gaps (ApiKey hash, FileRouter webhookUrl, File uploadId) if planner decides
- [ ] `apps/api/tests/` — test scaffolds for upload flow and API endpoints

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Presigned URL upload to R2 | UPLD-02 | Requires live R2 credentials | Configure R2 env vars, request presigned URL, upload file via curl |
| Multipart upload >10MB | UPLD-04 | Requires R2 + large test file | Upload 15MB file, verify multipart completion |
| QStash webhook delivery | UPLD-03 | Requires QStash + public URL | Configure QStash, trigger upload, verify callback received |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
