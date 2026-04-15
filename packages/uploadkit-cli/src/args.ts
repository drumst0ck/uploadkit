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
    /**
     * `restore --latest`: pick the newest backup session. After applying, the
     * session dir is moved to `.uploadkit-backup/.applied/<ts>/` so a
     * subsequent `restore --latest` picks the next-newest session.
     */
    latest: boolean;
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
    boolean: ['version', 'help', 'yes', 'skip-install', 'latest'],
    string: ['target', 'timestamp'],
    alias: {
      v: 'version',
      h: 'help',
      y: 'yes',
    },
  });

  const positionalAll = raw._.filter(
    (v): v is string =>
      typeof v === 'string' && v.length > 0 && v !== '--',
  );
  const [command, ...positional] = positionalAll;

  // Strip declared keys out of `raw` so callers can still inspect unknown ones.
  // The aliases (v/h/y) and `_` positional array are intentionally discarded
  // here; rest-sibling + `_`-prefix keeps the unused-vars rule happy.
  const {
    _: _underscore,
    v: _v,
    h: _h,
    y: _y,
    version,
    help,
    yes,
    'skip-install': skipInstall,
    latest,
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
      latest: Boolean(latest),
      target: typeof target === 'string' ? target : undefined,
      timestamp: typeof timestamp === 'string' ? timestamp : undefined,
      extra,
    },
  };
}
