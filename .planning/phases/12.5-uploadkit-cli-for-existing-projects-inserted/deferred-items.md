## 12.5-08 — discovered during e2e

### DEFECT: `add` subcommand broken in published bin (TEMPLATE_CANDIDATES path)
- **File:** `packages/uploadkit-cli/src/add/insert-component.ts` (lines 32–36)
- **Bug:** Second TEMPLATE_CANDIDATES entry resolves to `<pkg>/add-templates` instead of `<pkg>/dist/add-templates` where tsup copies component templates. `dist/index.js` therefore cannot load any add template and every `uploadkit add <alias>` invocation exits 1 with `Template not found for component alias`.
- **Scope:** Out of scope for 12.5-08 (task forbids edits under `src/add/`).
- **Recommended fix (future plan):** change second candidate from `resolve(MODULE_DIR, '..', 'add-templates')` to `resolve(MODULE_DIR, 'add-templates')`. Unit test `insert-component` already covers the src-path; add an e2e assertion against `dist` (see `e2e/add-and-restore.e2e.test.ts` — the `it.skip` block is seeded and ready).
- **Guard test already in place:** `e2e: add + restore roundtrip (next-app) > reports the add-template path defect surfaces as a clear error (regression guard)`. Fails loudly the day the bug is fixed, prompting reviewer to flip the skip.
