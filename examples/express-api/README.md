# UploadKit — Express API Example

Demonstrates server-side only usage: upload handling via `createExpressHandler` and
file management (list, delete) via the `createUploadKit` core client.

No frontend — use curl or any HTTP client to interact with the endpoints.

## Setup

1. Copy `.env.example` to `.env`, add your API key from [app.uploadkit.dev](https://app.uploadkit.dev) and set `EXAMPLE_ADMIN_TOKEN` (the server refuses to start without it)
2. `pnpm install` from the monorepo root
3. `pnpm dev` — starts Express on http://localhost:3012

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | /api/uploadkit/* | UploadKit handler (used by SDK clients) |
| GET | /files | List uploaded files (server-side, 20 results). Requires `Authorization: Bearer $EXAMPLE_ADMIN_TOKEN` |
| DELETE | /files/:key | Delete a file by storage key. Requires the same bearer token |
| GET | /health | Health check |

## Example Requests

```bash
# List files
curl -H "Authorization: Bearer $EXAMPLE_ADMIN_TOKEN" http://localhost:3012/files

# Delete a file
curl -X DELETE -H "Authorization: Bearer $EXAMPLE_ADMIN_TOKEN" http://localhost:3012/files/files%2Fabc123%2Fdocument.pdf
```

> The upload handler (`/api/uploadkit/*`) is anonymous in this demo. Add your own user auth in the router `middleware` before deploying; the server listens on `127.0.0.1` unless `HOST` is set.
