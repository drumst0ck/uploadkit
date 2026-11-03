---
"@uploadkitdev/core": patch
"@uploadkitdev/react": minor
---

Enforce a route's `maxFileCount` as a per-selection client-side limit. The React components and `useUploadKit().checkSelection(files)` reject a selection with more files than the limit, upload none of them, and report `TOO_MANY_FILES` through `onUploadError` or the hook's `error`. `ProxyUploadKitClient.getRouteConfig(route)` reads the handler's route config. Routes without `maxFileCount` keep working without a limit. It is a UX guard, not a server-side quota.
