---
'uploadkit': patch
---

Bundle the private `@uploadkitdev/shared` package into the CLI so the published package installs without unresolvable workspace dependencies. Fix generated code: the SvelteKit route now uses `createUploadKitHandler` from `@uploadkitdev/next` (the previous `uploadkit.handle()` did not exist) with relative imports that work on SvelteKit 2 and 3, and the Next.js layout provider now passes `endpoint="/api/uploadkit"`.
