# UploadKit — Express API Example

Demonstrates server-side only usage: upload handling via `createExpressHandler` and
file management (list, delete) via the `createUploadKit` core client.

No frontend — use curl or any HTTP client to interact with the endpoints.

## Setup

1. Copy `.env.example` to `.env` and add your API key from [app.uploadkit.dev](https://app.uploadkit.dev)
2. `pnpm install` from the monorepo root
3. `pnpm dev` — starts Express on http://localhost:3012

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | /api/uploadkit/* | UploadKit handler (used by SDK clients) |
| GET | /files | List uploaded files (server-side, 20 results) |
| DELETE | /files/:key | Delete a file by storage key |
| GET | /health | Health check |

## Example Requests

```bash
# List files
curl http://localhost:3012/files

# Delete a file
curl -X DELETE http://localhost:3012/files/files%2Fabc123%2Fdocument.pdf
```
