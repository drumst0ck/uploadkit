export const TEMPLATE_IDS = ['next', 'sveltekit', 'remix', 'vite'] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const PACKAGE_MANAGERS = ['pnpm', 'npm', 'yarn', 'bun'] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export interface ResolvedOptions {
  /** Sanitized npm-safe package name */
  name: string;
  /** Absolute path to target project directory */
  projectDir: string;
  template: TemplateId;
  pm: PackageManager;
  /**
   * Only meaningful for the `vite` template. Other templates force `true`
   * because they require TypeScript tooling out of the box.
   */
  typescript: boolean;
  install: boolean;
  gitInit: boolean;
}

export interface ParsedFlags {
  /** First positional argument, if any — the proposed project name/dir. */
  positional: string | undefined;
  template: TemplateId | undefined;
  pm: PackageManager | undefined;
  /** `--ts` / `--no-ts`. Only meaningful when `template === 'vite'`. */
  ts: boolean | undefined;
  /** `--yes` / `-y` — accept all defaults, skip all prompts. */
  yes: boolean;
  /** `--install` / `--no-install`. Defaults to `true` unless explicitly disabled. */
  install: boolean;
  /** `--git` / `--no-git`. Defaults to `true` unless explicitly disabled. */
  git: boolean;
  /** `--force` — overwrite non-empty target directory. */
  force: boolean;
  help: boolean;
  version: boolean;
  /** Accumulated validation errors from flag parsing (never thrown). */
  errors: string[];
}
