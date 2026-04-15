import type { DetectionResult } from '../detect/types.js';
import type { BackupSession } from '../backup/backup.js';

/**
 * Context passed to per-framework init modules. Keeps the framework impls
 * decoupled from the orchestrator — they don't parse flags or make top-level
 * decisions, they just mutate.
 */
export interface InitContext {
  /** Detection result produced by the orchestrator. */
  detection: DetectionResult;
  /** Absolute project root (duplicated from detection.root for convenience). */
  root: string;
  /** CLI-level flags that affect the impl. */
  flags: {
    yes: boolean;
    skipInstall: boolean;
  };
}

/**
 * Shape returned by every per-framework init implementation. The orchestrator
 * prints a summary based on these lists.
 */
export interface InitResult {
  /** true if nothing was changed because the project was already configured. */
  skipped: boolean;
  /** Package specifiers installed (or scheduled for install when skipInstall). */
  installed: string[];
  /** Files created by this run (absolute paths). */
  created: string[];
  /** Files modified by this run (absolute paths). */
  modified: string[];
}

/**
 * Per-framework init implementation signature. Receives the detection-derived
 * context and a backup session it must use to save any file it mutates and
 * record any file it creates.
 */
export type InitImpl = (ctx: InitContext, session: BackupSession) => Promise<InitResult>;
