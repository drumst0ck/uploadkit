# Phase 4: SDK Core & Next.js Adapter - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-08
**Phase:** 04-sdk-core-next-js-adapter
**Areas discussed:** Core SDK API, BYOS config, Type inference, Package output

---

## Core SDK API

### Factory config
| Option | Selected |
|--------|----------|
| API key + base URL (minimal) | ✓ |
| Full config object | |

### Upload method
| Option | Selected |
|--------|----------|
| Single method (transparent multipart) | ✓ |
| Separate methods | |

### Progress implementation
| Option | Selected |
|--------|----------|
| XHR with onProgress | ✓ |
| fetch + ReadableStream | |

---

## BYOS Config

### Config level
| Option | Selected |
|--------|----------|
| Handler-level only (@uploadkit/next) | ✓ |
| Factory + handler | |

### Providers
| Option | Selected |
|--------|----------|
| S3-compatible only | ✓ |
| S3 + GCS | |

---

## Type Inference

### Type flow pattern
| Option | Selected |
|--------|----------|
| Export AppFileRouter + generateReactHelpers<> generic | ✓ |
| Infer from import | |

### Typing depth
| Option | Selected |
|--------|----------|
| Route names + config (maxFileSize, allowedTypes) | ✓ |
| Route names only | |

---

## Package Output

### Build format
| Option | Selected |
|--------|----------|
| ESM + CJS via tsup | ✓ |
| ESM only | |

### Dependency strategy
| Option | Selected |
|--------|----------|
| Peer deps (react, next) | ✓ |
| Bundled deps | |

---

## Claude's Discretion

- Internal upload state machine, XHR wrapper, multipart chunking
- TypeScript generics architecture for fileRouter
- @uploadkit/core module structure
- BYOS S3Client initialization pattern

## Deferred Ideas

None
