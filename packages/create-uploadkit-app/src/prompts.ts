import path from 'node:path';
import fs from 'node:fs';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { detectPm } from './pm.js';
import {
  PACKAGE_MANAGERS,
  TEMPLATE_IDS,
  type PackageManager,
  type ParsedFlags,
  type ResolvedOptions,
  type TemplateId,
} from './types.js';

export class CancelledError extends Error {
  readonly code = 'CLI_CANCELLED';
  readonly exitCode = 130;
  constructor(message = 'Operation cancelled') {
    super(message);
    this.name = 'CancelledError';
  }
}

const DEFAULT_NAME = 'my-uploadkit-app';

const TEMPLATE_OPTIONS: Array<{ value: TemplateId; label: string; hint: string }> = [
  { value: 'next', label: 'Next.js', hint: 'App Router + Tailwind v4 + @uploadkitdev/next' },
  { value: 'sveltekit', label: 'SvelteKit', hint: 'Svelte 5 + presigned-URL endpoint' },
  { value: 'remix', label: 'React Router v7', hint: 'Framework mode + @uploadkitdev/react' },
  { value: 'vite', label: 'Vite + React', hint: 'SPA with BYOS demo' },
];

const PM_OPTIONS: Array<{ value: PackageManager; label: string }> = PACKAGE_MANAGERS.map(
  (value) => ({ value, label: value }),
);

/**
 * Loose npm-package-name validation that also forbids path separators.
 * Full validation happens when writing `package.json` later.
 */
function validateProjectName(value: string): string | undefined {
  if (!value || value.trim().length === 0) return 'Name is required';
  if (value.length > 214) return 'Name too long (max 214 chars)';
  if (/[A-Z]/.test(value)) return 'Use lowercase letters only';
  if (/[~)('!*\s/\\]/.test(value)) return 'Invalid character in name';
  if (value.startsWith('.') || value.startsWith('_')) return 'Cannot start with . or _';
  return undefined;
}

function sanitizeName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, '-')
    .replace(/^[-_]+/, '')
    .replace(/-+/g, '-');
}

function dirHasConflict(dir: string, force: boolean): boolean {
  if (force) return false;
  if (!fs.existsSync(dir)) return false;
  try {
    const entries = fs.readdirSync(dir);
    return entries.length > 0;
  } catch {
    return false;
  }
}

function ensureNotCancelled<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    throw new CancelledError();
  }
  return value;
}

/**
 * Run interactive prompts (or skip them when flags / --yes cover everything)
 * and return a fully-resolved options object. The returned object is
 * deterministic given identical flags + prompt answers — Wave 3 consumes it.
 */
export async function runPrompts(parsed: ParsedFlags): Promise<ResolvedOptions> {
  const detectedPm = detectPm();

  // --- project name ---
  let name: string | undefined = parsed.positional;
  if (!name) {
    if (parsed.yes) {
      name = DEFAULT_NAME;
    } else {
      const answer = await p.text({
        message: 'Project name?',
        placeholder: DEFAULT_NAME,
        defaultValue: DEFAULT_NAME,
        validate: (value) => {
          const candidate = !value || value.length === 0 ? DEFAULT_NAME : value;
          const problem = validateProjectName(candidate);
          if (problem) return problem;
          const targetDir = path.resolve(process.cwd(), candidate);
          if (dirHasConflict(targetDir, parsed.force)) {
            return `Directory "${candidate}" already exists and is not empty (use --force to override)`;
          }
          return undefined;
        },
      });
      name = ensureNotCancelled(answer) as string;
    }
  }
  const sanitized = sanitizeName(name);

  // --- template ---
  let template: TemplateId | undefined = parsed.template;
  if (!template) {
    if (parsed.yes) {
      template = 'next';
    } else {
      const answer = await p.select<TemplateId>({
        message: 'Which template?',
        options: TEMPLATE_OPTIONS,
        initialValue: 'next',
      });
      template = ensureNotCancelled(answer) as TemplateId;
    }
  }

  // --- package manager ---
  let pm: PackageManager | undefined = parsed.pm;
  if (!pm) {
    if (parsed.yes) {
      pm = detectedPm;
    } else {
      const answer = await p.select<PackageManager>({
        message: 'Package manager?',
        options: PM_OPTIONS,
        initialValue: detectedPm,
      });
      pm = ensureNotCancelled(answer) as PackageManager;
    }
  }

  // --- typescript (only meaningful for vite) ---
  let typescript: boolean;
  if (template === 'vite') {
    if (parsed.ts !== undefined) {
      typescript = parsed.ts;
    } else if (parsed.yes) {
      typescript = true;
    } else {
      const answer = await p.confirm({
        message: 'Use TypeScript?',
        initialValue: true,
      });
      typescript = ensureNotCancelled(answer) as boolean;
    }
  } else {
    // next/sveltekit/remix always use TypeScript
    typescript = true;
  }

  // --- install ---
  let install: boolean;
  if (!parsed.install) {
    install = false;
  } else if (parsed.yes) {
    install = true;
  } else {
    const answer = await p.confirm({
      message: `Install dependencies with ${pm}?`,
      initialValue: true,
    });
    install = ensureNotCancelled(answer) as boolean;
  }

  // --- git init ---
  let gitInit: boolean;
  if (!parsed.git) {
    gitInit = false;
  } else if (parsed.yes) {
    gitInit = true;
  } else {
    const answer = await p.confirm({
      message: 'Initialise a git repository?',
      initialValue: true,
    });
    gitInit = ensureNotCancelled(answer) as boolean;
  }

  const projectDir = path.resolve(process.cwd(), sanitized);

  return {
    name: sanitized,
    projectDir,
    template,
    pm,
    typescript,
    install,
    gitInit,
  };
}

/**
 * Helper for the CLI entry: prints a friendly "cancelled" message using
 * picocolors so the exit path is consistent with the rest of the tool.
 */
export function printCancelled(): void {
  process.stderr.write(`${pc.yellow('✖')} Cancelled.\n`);
}

export { TEMPLATE_IDS };
