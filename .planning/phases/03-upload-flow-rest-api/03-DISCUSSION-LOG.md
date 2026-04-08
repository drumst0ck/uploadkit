# Phase 3: Upload Flow & REST API - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 03-upload-flow-rest-api
**Areas discussed:** API structure, Upload lifecycle, Error responses, Webhook delivery

---

## API Structure

### Framework
| Option | Description | Selected |
|--------|-------------|----------|
| Next.js API routes | Keep in apps/api as App Router route handlers | ✓ |
| Hono on Next.js | Hono inside catch-all route. Better middleware chain. | |
| You decide | | |

**User's choice:** Next.js API routes

### Auth pattern
| Option | Description | Selected |
|--------|-------------|----------|
| Wrapper function | withApiKey(handler) HOC. Validates key, attaches project, returns 401. | ✓ |
| Middleware chain | Next.js or Hono middleware before /api/v1/*. | |
| You decide | | |

**User's choice:** Wrapper function

### Route organization
| Option | Description | Selected |
|--------|-------------|----------|
| Next.js file routes | One file per endpoint. Native Next.js pattern. | ✓ |
| Grouped handlers | Handlers in src/handlers/, catch-all dispatches. | |
| You decide | | |

**User's choice:** Next.js file routes

---

## Upload Lifecycle

### Multipart threshold
| Option | Description | Selected |
|--------|-------------|----------|
| 10MB / 5MB chunks | Standard. R2 minimum part 5MB. | ✓ |
| 5MB / 5MB chunks | Lower threshold. More resilient on slow connections. | |
| You decide | | |

**User's choice:** 10MB / 5MB chunks

### Confirm step
| Option | Description | Selected |
|--------|-------------|----------|
| Verify + store + callback | HEAD object in R2, store metadata, fire webhook, update usage. | ✓ |
| Store + callback only | Skip R2 verification. Trust presigned URL. | |
| You decide | | |

**User's choice:** Verify + store + callback

### Cleanup strategy
| Option | Description | Selected |
|--------|-------------|----------|
| Cron job (1h TTL) | Query UPLOADING records >1h, delete from R2 + DB. | ✓ |
| R2 lifecycle rule | R2 auto-deletes after 24h. DB cleanup separate. | |
| Both | R2 lifecycle + cron. Belt and suspenders. | |

**User's choice:** Cron job (1h TTL)

---

## Error Responses

### Error format
| Option | Description | Selected |
|--------|-------------|----------|
| Stripe-style | { error: { type, code, message, suggestion } } | ✓ |
| Simple JSON | { error, message } — flatter. | |
| You decide | | |

**User's choice:** Stripe-style

### Validation
| Option | Description | Selected |
|--------|-------------|----------|
| Zod schemas | Schema per endpoint. Type-safe + descriptive errors. | ✓ |
| Manual checks | Simple if/else. Less overhead. | |
| You decide | | |

**User's choice:** Zod schemas

---

## Webhook Delivery

### Callback mode
| Option | Description | Selected |
|--------|-------------|----------|
| Inline (sync) | Run callback during confirm-upload. Response waits. | |
| Async queue | Enqueue callback, return immediately. | ✓ |
| You decide | | |

**User's choice:** Async queue

### Retry policy
| Option | Description | Selected |
|--------|-------------|----------|
| No retry in v1 | Log failure, mark complete anyway. | |
| 3 retries | Exponential backoff (1s, 5s, 25s). Failed after 3. | ✓ |
| You decide | | |

**User's choice:** 3 retries

### Queue infrastructure
| Option | Description | Selected |
|--------|-------------|----------|
| In-process queue | In-memory. Loses jobs on restart. | |
| Upstash QStash | Serverless queue. HTTP-based, auto-retry. | ✓ |
| You decide | | |

**User's choice:** Upstash QStash

---

## Claude's Discretion

- Zod schema design per endpoint
- withApiKey implementation details
- Rate limiting wiring pattern
- Multipart upload API endpoints
- Cron job implementation
- QStash integration specifics
- Pagination strategy

## Deferred Ideas

None
