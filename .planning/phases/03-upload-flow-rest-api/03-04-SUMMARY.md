---
phase: 03-upload-flow-rest-api
plan: "04"
subsystem: api
tags: [logs, cron, cleanup, qstash, dlq, webhooks, r2, mongodb]
dependency_graph:
  requires: ["03-02", "03-03"]
  provides: ["logs-polling-endpoint", "orphaned-upload-cleanup-cron", "qstash-dlq-callback"]
  affects: ["06-dashboard"]
tech_stack:
  added: []
  patterns:
    - "CRON_SECRET header auth for cron endpoint (not API key)"
    - "Promise.allSettled for fault-tolerant parallel R2 cleanup"
    - "QStash Receiver HMAC verification for DLQ webhook"
    - "Conditional signing key check: skip verification in dev, enforce in prod"
key_files:
  created:
    - apps/api/src/app/api/v1/logs/route.ts
    - apps/api/src/app/api/cron/cleanup/route.ts
    - apps/api/src/app/api/v1/webhooks/qstash-dlq/route.ts
    - vercel.json
  modified:
    - packages/db/src/models/file.ts
    - .env.example
decisions:
  - "Cleanup accepts both x-cron-secret header and Authorization: Bearer for Vercel Cron compatibility"
  - "Promise.allSettled used for stale file cleanup — individual R2/DB errors do not abort the batch"
  - "QStash DLQ only sets webhookFailedAt timestamp — no destructive action minimizes blast radius"
  - "Signing key check is conditional — dev environments without keys skip verification with a warning"
metrics:
  duration: "3m"
  completed: "2026-04-08"
  tasks: 2
  files_changed: 6
requirements:
  - API-07
  - UPLD-09
  - UPLD-10
---

# Phase 03 Plan 04: Logs Endpoint, Cleanup Cron, and QStash DLQ Summary

Upload logs polling endpoint (API-07), orphaned upload cleanup cron (UPLD-09), and QStash dead-letter queue callback (D-10) implemented with full threat mitigations from the plan's STRIDE register.

## What Was Built

### Task 1: Upload logs endpoint and orphaned upload cleanup cron (fd64994)

**GET /api/v1/logs** — polling endpoint for the dashboard upload logs page. Accepts `since` timestamp and `limit` query params validated through `LogsQuerySchema`. Logs are scoped by `projectId` from the `withApiKey` context (T-03-20) — cannot view another project's events. Returns events sorted newest-first for 5-second dashboard polling.

**GET /api/cron/cleanup** — hourly cron job that prevents orphaned R2 objects from accumulating storage costs. Finds all `UPLOADING` files older than 1 hour, then for each:
- If `uploadId` is set: calls `AbortMultipartUploadCommand` to cancel the in-progress multipart upload
- Calls `DeleteObjectCommand` to remove the R2 object (no-op if upload never completed)
- Calls `File.deleteOne` to remove the MongoDB record

Protected by `CRON_SECRET` via both `x-cron-secret` header and `Authorization: Bearer` (Vercel Cron format). `Promise.allSettled` ensures one failed file doesn't abort the batch (T-03-19).

**vercel.json** — cron schedule `0 * * * *` (every hour on the hour, matching D-06's 1-hour cutoff).

### Task 2: QStash DLQ callback route (2e5a712)

**POST /api/v1/webhooks/qstash-dlq** — called by QStash when all retries for a webhook delivery are exhausted. Verifies the `Upstash-Signature` HMAC header via `@upstash/qstash` `Receiver` (T-03-22). Parses the original webhook payload, extracts `file.id`, and calls `File.findByIdAndUpdate` to set `webhookFailedAt: new Date()` (T-03-23). Returns `{ ok: true }` with 200 to acknowledge receipt to QStash.

In dev environments without `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY`, signature verification is skipped with a `console.warn` — hard-failing would break local development where QStash is not configured.

**File model** — added `webhookFailedAt?: Date` to `IFile` interface and `fileSchema` (optional Date, no default).

## Deviations from Plan

None — plan executed exactly as written.

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-03-18 | CRON_SECRET header validation — rejects requests without valid secret |
| T-03-19 | Promise.allSettled — no cascading failure on individual file cleanup errors |
| T-03-20 | Logs scoped by projectId from withApiKey context |
| T-03-22 | Upstash-Signature HMAC verification via Receiver from @upstash/qstash |
| T-03-23 | DLQ only sets webhookFailedAt timestamp — no destructive action; fileId validated before update |

## Known Stubs

None — all endpoints are fully wired with real DB queries and R2 operations.

## Threat Flags

None — all new endpoints are within the plan's threat model.

## Self-Check: PASSED

Files exist:
- apps/api/src/app/api/v1/logs/route.ts: FOUND
- apps/api/src/app/api/cron/cleanup/route.ts: FOUND
- apps/api/src/app/api/v1/webhooks/qstash-dlq/route.ts: FOUND
- vercel.json: FOUND
- packages/db/src/models/file.ts (webhookFailedAt): FOUND

Commits exist:
- fd64994: Task 1 — logs endpoint, cleanup cron, vercel.json
- 2e5a712: Task 2 — QStash DLQ route, webhookFailedAt field
