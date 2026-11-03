---
"uploadkit": patch
"create-uploadkit-app": patch
"@uploadkitdev/mcp": patch
---

Harden CLI migrations, restore, project creation, and MCP scaffolds:

- Generate UploadThing migration routers with the supported `FileRouter` type. Refuse to overwrite an existing `lib/uploadkit.ts`, including with `--yes`.
- Reject unsafe restore target and backup paths, symlink escapes, and manifests that redirect the project root or backup session. Preflight the full restore plan before changing files: read and retain every required modified-file backup, and validate `--latest` archive source/destination containment (including dangling symlink ancestors). Missing/unreadable backups, unsafe archive paths, and existing archive destinations fail with exit code 1 before restore mutations or archive moves. Preflight is not an atomic filesystem transaction or protection against concurrent hostile path swaps.
- Apply project-name validation and destination conflict checks to positional names and noninteractive defaults as well as interactive names. `--force` bypasses destination conflicts, not name validation.
- Reject unsupported package managers, empty dependency lists, and package names outside the `@uploadkitdev/` lowercase-letter/hyphen namespace in MCP install commands.
- Bound MCP image transforms to 30 seconds and return readable tool errors for timeouts, network failures, and invalid JSON responses.
- Generate GCS BYOS configuration with HMAC access keys and the interoperability endpoint; omit unsupported B2 factory options.
