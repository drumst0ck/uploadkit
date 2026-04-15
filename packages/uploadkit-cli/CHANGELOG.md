# uploadkit

## 0.1.0

### Minor Changes

- 5b4d1a1: Initial release of the `uploadkit` CLI. Run `npx uploadkit init` inside
  an existing Next.js, SvelteKit, Remix, or Vite+React project to wire up
  UploadKit — deps installed, route handler created, provider mounted,
  env vars scaffolded. `npx uploadkit add <component>` inserts individual
  components shadcn-style. Backed up to `.uploadkit-backup/`; roll back
  with `uploadkit restore`.
