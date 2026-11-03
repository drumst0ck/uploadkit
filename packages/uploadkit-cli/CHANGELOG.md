# uploadkit

## 0.1.1

### Patch Changes

- 4d7bc89: Bundle the private `@uploadkitdev/shared` package into the CLI so the published package installs without unresolvable workspace dependencies. Fix generated code: the SvelteKit route now uses `createUploadKitHandler` from `@uploadkitdev/next` (the previous `uploadkit.handle()` did not exist) with relative imports that work on SvelteKit 2 and 3, and the Next.js layout provider now passes `endpoint="/api/uploadkit"`.
- 601fe4b: Harden CLI migrations, restore, project creation, and MCP scaffolds:
  - Generate UploadThing migration routers with the supported `FileRouter` type. Refuse to overwrite an existing `lib/uploadkit.ts`, including with `--yes`.
  - Reject unsafe restore target and backup paths, symlink escapes, and manifests that redirect the project root or backup session. Preflight the full restore plan before changing files: read and retain every required modified-file backup, and validate `--latest` archive source/destination containment (including dangling symlink ancestors). Missing/unreadable backups, unsafe archive paths, and existing archive destinations fail with exit code 1 before restore mutations or archive moves. Preflight is not an atomic filesystem transaction or protection against concurrent hostile path swaps.
  - Apply project-name validation and destination conflict checks to positional names and noninteractive defaults as well as interactive names. `--force` bypasses destination conflicts, not name validation.
  - Reject unsupported package managers, empty dependency lists, and package names outside the `@uploadkitdev/` lowercase-letter/hyphen namespace in MCP install commands.
  - Bound MCP image transforms to 30 seconds and return readable tool errors for timeouts, network failures, and invalid JSON responses.
  - Generate GCS BYOS configuration with HMAC access keys and the interoperability endpoint; omit unsupported B2 factory options.

## 0.1.0

### Minor Changes

- 5b4d1a1: Initial release of the `uploadkit` CLI. Run `npx uploadkit init` inside
  an existing Next.js, SvelteKit, Remix, or Vite+React project to wire up
  UploadKit — deps installed, route handler created, provider mounted,
  env vars scaffolded. `npx uploadkit add <component>` inserts individual
  components shadcn-style. Backed up to `.uploadkit-backup/`; roll back
  with `uploadkit restore`.
