import mri from 'mri';

/**
 * Parsed CLI invocation. `command` is the first positional token (e.g. "init",
 * "add", "restore"); `positional` is the remainder (e.g. `["dropzone"]` for
 * `uploadkit add dropzone`); `flags` is the raw, typed flag bag.
 */
export interface ParsedArgs {
  command: string | undefined;
  positional: string[];
  flags: {
    version: boolean;
    help: boolean;
    yes: boolean;
    skipInstall: boolean;
    target: string | undefined;
    timestamp: string | undefined;
    /** Any extra flags we did not explicitly declare, preserved verbatim. */
    extra: Record<string, unknown>;
  };
}

/**
 * Thin mri wrapper. Keeps the parser generic enough that subcommand-specific
 * flags (e.g. `--target` for `add`, `--timestamp` for `restore`) all live in
 * one table — individual commands pick what they need.
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const raw = mri(argv, {
    boolean: ['version', 'help', 'yes', 'skip-install'],
    string: ['target', 'timestamp'],
    alias: {
      v: 'version',
      h: 'help',
      y: 'yes',
    },
  });

  const positionalAll = raw._.filter(
    (v): v is string => typeof v === 'string' && v.length > 0,
  );
  const [command, ...positional] = positionalAll;

  // Strip declared keys out of `raw` so callers can still inspect unknown ones.
  const {
    _: _underscore,
    v,
    h,
    y,
    version,
    help,
    yes,
    'skip-install': skipInstall,
    target,
    timestamp,
    ...extra
  } = raw as Record<string, unknown> & { _: unknown[] };

  return {
    command,
    positional,
    flags: {
      version: Boolean(version),
      help: Boolean(help),
      yes: Boolean(yes),
      skipInstall: Boolean(skipInstall),
      target: typeof target === 'string' ? target : undefined,
      timestamp: typeof timestamp === 'string' ? timestamp : undefined,
      extra,
    },
  };
}
