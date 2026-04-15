import mri from 'mri';
import {
  PACKAGE_MANAGERS,
  TEMPLATE_IDS,
  type PackageManager,
  type ParsedFlags,
  type TemplateId,
} from './types.js';

/**
 * Parse CLI flags into a typed, validated {@link ParsedFlags} object.
 *
 * Validation errors (unknown template, unknown package manager) are
 * accumulated on `errors` rather than thrown — the prompts layer turns
 * them into friendly output.
 */
export function parseArgs(argv: string[]): ParsedFlags {
  const raw = mri(argv, {
    boolean: ['help', 'version', 'yes', 'install', 'git', 'ts', 'force'],
    string: ['template', 'pm'],
    alias: {
      h: 'help',
      v: 'version',
      y: 'yes',
      t: 'template',
    },
    default: {
      install: true,
      git: true,
    },
  });

  const errors: string[] = [];

  const positional =
    typeof raw._[0] === 'string' && raw._[0].length > 0 ? raw._[0] : undefined;

  let template: TemplateId | undefined;
  if (typeof raw.template === 'string' && raw.template.length > 0) {
    if ((TEMPLATE_IDS as readonly string[]).includes(raw.template)) {
      template = raw.template as TemplateId;
    } else {
      errors.push(
        `Unknown --template "${raw.template}". Expected one of: ${TEMPLATE_IDS.join(', ')}.`,
      );
    }
  }

  let pm: PackageManager | undefined;
  if (typeof raw.pm === 'string' && raw.pm.length > 0) {
    if ((PACKAGE_MANAGERS as readonly string[]).includes(raw.pm)) {
      pm = raw.pm as PackageManager;
    } else {
      errors.push(
        `Unknown --pm "${raw.pm}". Expected one of: ${PACKAGE_MANAGERS.join(', ')}.`,
      );
    }
  }

  // mri assigns `true` for `--ts`, `false` for `--no-ts`, and leaves the key
  // absent when the flag was not passed. We declare it as boolean above, so
  // mri always produces a boolean; to distinguish "not passed" from "false"
  // we re-scan argv for the explicit tokens.
  let ts: boolean | undefined;
  if (argv.includes('--ts')) ts = true;
  else if (argv.includes('--no-ts')) ts = false;

  return {
    positional,
    template,
    pm,
    ts,
    yes: Boolean(raw.yes),
    install: Boolean(raw.install),
    git: Boolean(raw.git),
    force: Boolean(raw.force),
    help: Boolean(raw.help),
    version: Boolean(raw.version),
    errors,
  };
}

export type { ParsedFlags };
