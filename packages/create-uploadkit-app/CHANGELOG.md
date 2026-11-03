# create-uploadkit-app

## 0.1.1

### Patch Changes

- 0e8c896: SvelteKit and Remix templates read `R2_BUCKET_NAME` (the name used across the UploadKit docs), still accepting `R2_BUCKET` for projects created earlier.
- 601fe4b: Harden CLI migrations, restore, project creation, and MCP scaffolds:
  - Generate UploadThing migration routers with the supported `FileRouter` type. Refuse to overwrite an existing `lib/uploadkit.ts`, including with `--yes`.
  - Reject unsafe restore target and backup paths, symlink escapes, and manifests that redirect the project root or backup session. Preflight the full restore plan before changing files: read and retain every required modified-file backup, and validate `--latest` archive source/destination containment (including dangling symlink ancestors). Missing/unreadable backups, unsafe archive paths, and existing archive destinations fail with exit code 1 before restore mutations or archive moves. Preflight is not an atomic filesystem transaction or protection against concurrent hostile path swaps.
  - Apply project-name validation and destination conflict checks to positional names and noninteractive defaults as well as interactive names. `--force` bypasses destination conflicts, not name validation.
  - Reject unsupported package managers, empty dependency lists, and package names outside the `@uploadkitdev/` lowercase-letter/hyphen namespace in MCP install commands.
  - Bound MCP image transforms to 30 seconds and return readable tool errors for timeouts, network failures, and invalid JSON responses.
  - Generate GCS BYOS configuration with HMAC access keys and the interoperability endpoint; omit unsupported B2 factory options.

## 0.1.0

### Minor Changes

- 191c7b6: Initial release of `create-uploadkit-app`. Scaffold a new UploadKit project in seconds:

  ```bash
  npm create uploadkit-app@latest
  pnpm create uploadkit-app
  yarn create uploadkit-app
  bun create uploadkit-app
  ```

  Ships four starter templates (`next`, `sveltekit`, `remix`, `vite`) with interactive
  prompts powered by `@clack/prompts`, automatic package-manager detection, and SDK
  dependencies pinned to the latest published `@uploadkitdev/*` versions at publish time.
