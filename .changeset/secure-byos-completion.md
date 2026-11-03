---
"@uploadkitdev/next": minor
"@uploadkitdev/core": minor
"@uploadkitdev/react": patch
---

Harden the SDK handler and clients (security audit):

- **BYOS completion now requires proof of initiation (breaking for BYOS).** The upload request returns a signed, expiring `uploadToken`; completion verifies it, checks the stored object matches the granted size and type, and passes server-built file metadata (with a signed GET URL) to `onUploadComplete`. Client-supplied `file` metadata is no longer accepted. Upgrade `@uploadkitdev/next`, `@uploadkitdev/core` and `@uploadkitdev/react` together; mismatched versions fail with `INVALID_UPLOAD_GRANT` or `UPLOAD_GRANT_REQUIRED`.
- BYOS presigned PUT URLs sign `Content-Type` and `Content-Length`. Upload requests without a valid `contentLength` and `contentType` fail with `400 INVALID_UPLOAD`.
- Handler errors return a generic `Internal server error` instead of internal messages. Route lookup ignores prototype keys such as `__proto__`.
- Managed mode runs route middleware before confirming completion.
- Express adapter requires a parsed JSON body and drops stale framing headers; Hono adapter resolves wildcard routes mounted under a prefix.
- `generateReactHelpers` from `@uploadkitdev/next` forwards to the real `@uploadkitdev/react` implementation; the browser entry no longer pulls storage code.
- Core: base URLs must be `https` (or `http` on localhost); multipart parts retry, abort together, and never abort after completion was dispatched; abort listeners are removed after each XHR.
- React: unmounting or starting a new upload aborts the previous one without stale progress; `reset()` now also cancels an in-flight upload; video thumbnails revoke object URLs safely.
