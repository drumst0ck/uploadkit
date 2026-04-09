---
phase: quick
plan: ilx
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/docs/content/docs/getting-started/quickstart.mdx
  - apps/docs/content/docs/getting-started/nextjs.mdx
  - apps/docs/content/docs/getting-started/react.mdx
  - apps/docs/content/docs/guides/multipart-upload.mdx
  - apps/docs/content/docs/guides/image-upload.mdx
  - apps/docs/content/docs/sdk/react/installation.mdx
  - apps/docs/content/docs/sdk/react/api-reference.mdx
  - apps/docs/content/docs/sdk/next/installation.mdx
  - apps/docs/content/docs/sdk/next/api-reference.mdx
  - apps/docs/content/docs/sdk/next/type-safety.mdx
  - apps/docs/content/docs/sdk/next/middleware.mdx
  - apps/docs/content/docs/sdk/next/file-router.mdx
  - apps/docs/content/docs/sdk/core/installation.mdx
  - apps/docs/content/docs/sdk/core/api-reference.mdx
  - apps/docs/content/docs/sdk/core/configuration.mdx
  - apps/docs/content/docs/sdk/core/upload.mdx
  - apps/docs/content/docs/sdk/core/delete.mdx
  - apps/docs/content/docs/core-concepts/security.mdx
  - apps/docs/content/docs/core-concepts/presigned-urls.mdx
autonomous: true
requirements: [DOC-SECURITY]

must_haves:
  truths:
    - "No doc page shows an API key passed to UploadKitProvider"
    - "All UploadKitProvider usage shows endpoint prop"
    - "Quickstart and nextjs guide show server route setup before client usage"
    - "Security doc explains proxy pattern"
    - "Core SDK docs distinguish server-side createUploadKit vs browser createProxyClient"
  artifacts:
    - path: "apps/docs/content/docs/getting-started/quickstart.mdx"
      provides: "Correct provider setup with endpoint prop"
    - path: "apps/docs/content/docs/core-concepts/security.mdx"
      provides: "Proxy pattern explanation"
    - path: "apps/docs/content/docs/sdk/core/configuration.mdx"
      provides: "createUploadKit server-only / createProxyClient browser distinction"
  key_links:
    - from: "UploadKitProvider"
      to: "/api/uploadkit"
      via: "endpoint prop"
      pattern: "endpoint=\"/api/uploadkit\""
---

<objective>
Update all 19 documentation MDX files to reflect the SDK security refactor where API keys
stay server-side only and browser components communicate via a local Next.js endpoint proxy.

Purpose: Ensure no documentation ever instructs developers to expose API keys in client
code. Every UploadKitProvider usage must show endpoint="/api/uploadkit", not apiKey.

Output: 19 updated MDX files with consistent endpoint-proxy pattern throughout.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update quickstart, getting-started guides, and guides (10 files)</name>
  <files>
    apps/docs/content/docs/getting-started/quickstart.mdx,
    apps/docs/content/docs/getting-started/nextjs.mdx,
    apps/docs/content/docs/getting-started/react.mdx,
    apps/docs/content/docs/guides/multipart-upload.mdx,
    apps/docs/content/docs/guides/image-upload.mdx
  </files>
  <action>
Read each file first. Apply the following changes consistently:

1. Replace every occurrence of:
   - `<UploadKitProvider apiKey="uk_live_xxxxxxxxxxxxxxxxxxxxx">` → `<UploadKitProvider endpoint="/api/uploadkit">`
   - `<UploadKitProvider apiKey={process.env.NEXT_PUBLIC_UPLOADKIT_API_KEY!}>` → `<UploadKitProvider endpoint="/api/uploadkit">`
   - Any other `apiKey` prop on `UploadKitProvider` → `endpoint="/api/uploadkit"`

2. In quickstart.mdx and nextjs.mdx specifically: ensure the server-side route handler setup
   (creating `app/api/uploadkit/route.ts` with `createUploadKitHandler({ apiKey: process.env.UPLOADKIT_API_KEY })`)
   appears as a numbered step BEFORE the step that shows `<UploadKitProvider endpoint="/api/uploadkit">`.
   The route handler step should use `UPLOADKIT_API_KEY` (no NEXT_PUBLIC_ prefix) to reinforce server-side-only.

3. In react.mdx: since plain React (non-Next.js) users need a backend, clarify that the endpoint
   points to their own backend which proxies to UploadKit. Show example:
   `<UploadKitProvider endpoint="/api/uploadkit">` with a note that this endpoint is
   their own server, not the UploadKit API directly.

4. In guides (multipart-upload.mdx, image-upload.mdx): apply the same apiKey → endpoint prop
   replacement. If either guide shows creating the handler, ensure apiKey is `UPLOADKIT_API_KEY`
   (server env var, no NEXT_PUBLIC_ prefix).

5. NEVER show `apiKey` as a prop on `UploadKitProvider` anywhere in these files. If any code
   block shows API key values directly (not as placeholders), replace with `uk_live_xxxxxxxxxxxxxxxxxxxxx`.
  </action>
  <verify>
    <automated>grep -rn "apiKey" apps/docs/content/docs/getting-started/ apps/docs/content/docs/guides/ | grep "UploadKitProvider" || echo "CLEAN — no apiKey on UploadKitProvider"</automated>
  </verify>
  <done>
    All UploadKitProvider usages in getting-started and guides use endpoint prop.
    Quickstart and nextjs guide show route handler setup before provider usage.
    No API key exposed in client-side code blocks.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update SDK reference docs and core-concepts (14 files)</name>
  <files>
    apps/docs/content/docs/sdk/react/installation.mdx,
    apps/docs/content/docs/sdk/react/api-reference.mdx,
    apps/docs/content/docs/sdk/next/installation.mdx,
    apps/docs/content/docs/sdk/next/api-reference.mdx,
    apps/docs/content/docs/sdk/next/type-safety.mdx,
    apps/docs/content/docs/sdk/next/middleware.mdx,
    apps/docs/content/docs/sdk/next/file-router.mdx,
    apps/docs/content/docs/sdk/core/installation.mdx,
    apps/docs/content/docs/sdk/core/api-reference.mdx,
    apps/docs/content/docs/sdk/core/configuration.mdx,
    apps/docs/content/docs/sdk/core/upload.mdx,
    apps/docs/content/docs/sdk/core/delete.mdx,
    apps/docs/content/docs/core-concepts/security.mdx,
    apps/docs/content/docs/core-concepts/presigned-urls.mdx
  </files>
  <action>
Read each file first. Apply changes by file group:

**SDK React (installation.mdx, api-reference.mdx):**
- Replace all `<UploadKitProvider apiKey="...">` / `<UploadKitProvider apiKey={...}>` with
  `<UploadKitProvider endpoint="/api/uploadkit">`
- In api-reference.mdx: update the prop table for UploadKitProvider — remove `apiKey` prop
  entry, add `endpoint` prop documented as: `string` — The local API route that proxies
  requests to the UploadKit API. Example: `"/api/uploadkit"`. Required.

**SDK Next (installation.mdx, api-reference.mdx, type-safety.mdx, middleware.mdx, file-router.mdx):**
- Replace all `<UploadKitProvider apiKey="...">` with `<UploadKitProvider endpoint="/api/uploadkit">`
- In installation.mdx: ensure the order is (1) create route handler with server apiKey,
  (2) wrap with provider using endpoint. Server handler example must use
  `process.env.UPLOADKIT_API_KEY` (no NEXT_PUBLIC_ prefix).
- In api-reference.mdx: update UploadKitProvider prop table same as react api-reference above.
- type-safety.mdx, middleware.mdx, file-router.mdx: replace any provider apiKey usage.

**SDK Core (installation.mdx, api-reference.mdx, configuration.mdx, upload.mdx, delete.mdx):**
- These docs cover `@uploadkit/core` which is server-side. The pattern here is different:
  `createUploadKit({ apiKey: process.env.UPLOADKIT_API_KEY })` stays as-is because
  this is CORRECT — core is server-side only.
- In configuration.mdx: add a clear note/callout distinguishing the two usage patterns:
  - Server-side: `createUploadKit({ apiKey: process.env.UPLOADKIT_API_KEY })` — server only,
    never import in client components.
  - Browser proxy client: `createProxyClient({ endpoint: "/api/uploadkit" })` — for browser
    usage, talks to your local Next.js route which holds the real API key.
- In api-reference.mdx: if it documents a client factory function for browser, ensure it
  shows `createProxyClient({ endpoint })` not `createUploadKit({ apiKey })`.
- upload.mdx and delete.mdx: if they show any browser-side code that uses apiKey directly,
  replace with the proxy client pattern using endpoint.

**Core Concepts (security.mdx, presigned-urls.mdx):**
- security.mdx: Add or update a section explaining the endpoint proxy pattern:
  "API keys are kept server-side. `UploadKitProvider` accepts an `endpoint` prop pointing
  to a Next.js Route Handler (e.g. `/api/uploadkit`). Browser components call this local
  endpoint, which holds the API key server-side and proxies requests to the UploadKit API.
  This means the API key never touches the browser."
  Include a simple architecture diagram in text/code block:
  `Browser → /api/uploadkit (your server, holds UPLOADKIT_API_KEY) → api.uploadkit.dev`
- presigned-urls.mdx: if it shows any provider with apiKey, replace with endpoint pattern.

**Global rule for all files:** Never show `apiKey` as a prop on `UploadKitProvider`.
Never show raw API key values outside of server-side code — always use
`process.env.UPLOADKIT_API_KEY` (no NEXT_PUBLIC_ prefix) or `uk_live_xxxxxxxxxxxxxxxxxxxxx`
as placeholder.
  </action>
  <verify>
    <automated>grep -rn "UploadKitProvider" apps/docs/content/docs/sdk/ apps/docs/content/docs/core-concepts/ | grep "apiKey" || echo "CLEAN — no apiKey on UploadKitProvider in sdk/core-concepts docs"</automated>
  </verify>
  <done>
    All UploadKitProvider usages in SDK and core-concepts docs use endpoint prop.
    UploadKitProvider prop tables updated to document endpoint instead of apiKey.
    Core SDK docs clarify server-side createUploadKit vs browser createProxyClient.
    Security doc explains the proxy architecture with a clear flow diagram.
    No NEXT_PUBLIC_ env var used for API keys anywhere.
  </done>
</task>

</tasks>

<verification>
After both tasks complete:

```bash
# No UploadKitProvider with apiKey prop anywhere in docs
grep -rn "UploadKitProvider" apps/docs/content/docs/ | grep "apiKey" && echo "FAIL" || echo "PASS"

# No NEXT_PUBLIC_UPLOADKIT_API_KEY anywhere (should not appear in updated docs)
grep -rn "NEXT_PUBLIC_UPLOADKIT_API_KEY" apps/docs/content/docs/ && echo "FOUND — review these" || echo "CLEAN"

# All provider usages have endpoint prop
grep -rn "UploadKitProvider" apps/docs/content/docs/ | grep "endpoint" | wc -l
```
</verification>

<success_criteria>
- Zero occurrences of `apiKey` prop on `UploadKitProvider` across all 19 MDX files
- Every `UploadKitProvider` usage has `endpoint="/api/uploadkit"`
- quickstart.mdx and nextjs.mdx show route handler before provider in the setup flow
- security.mdx contains proxy architecture explanation with browser → server → api flow
- core configuration.mdx distinguishes createUploadKit (server) from createProxyClient (browser)
- No `NEXT_PUBLIC_` prefixed API key env var referenced anywhere
</success_criteria>

<output>
After completion, create `.planning/quick/260409-ilx-update-docs-for-sdk-endpoint-proxy-patte/260409-ilx-SUMMARY.md`
</output>
