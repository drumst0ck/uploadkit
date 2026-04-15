import type { InitImpl } from './types.js';

/**
 * Placeholder — real implementation in Task 2. Keeps the import graph valid
 * so the orchestrator can dispatch to a concrete function during Task 1.
 */
export const initNextApp: InitImpl = async () => ({
  skipped: false,
  installed: [],
  created: [],
  modified: [],
});
