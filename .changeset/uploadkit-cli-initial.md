---
'uploadkit': minor
---

Initial release of the `uploadkit` CLI. Run `npx uploadkit init` inside
an existing Next.js, SvelteKit, Remix, or Vite+React project to wire up
UploadKit — deps installed, route handler created, provider mounted,
env vars scaffolded. `npx uploadkit add <component>` inserts individual
components shadcn-style. Backed up to `.uploadkit-backup/`; roll back
with `uploadkit restore`.
