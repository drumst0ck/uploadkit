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
    // migrate-supabase flags
    supabaseUrl: string | undefined;
    supabaseKey: string | undefined;
    supabaseBucket: string | undefined;
    uploadkitKey: string | undefined;
    uploadkitRoute: string | undefined;
    uploadkitApi: string | undefined;
    prefix: string | undefined;
    concurrency: number | undefined;
    out: string | undefined;
    resume: string | undefined;
    dryRun: boolean;
    // rewrite-urls flags
    mapping: string | undefined;
    glob: string | undefined;
    /** Any extra flags we did not explicitly declare, preserved verbatim. */
    extra: Record<string, unknown>;
  };
}

const STRING_FLAGS = [
  'target',
  'timestamp',
  'supabase-url',
  'supabase-key',
  'supabase-bucket',
  'uploadkit-key',
  'uploadkit-route',
  'uploadkit-api',
  'prefix',
  'concurrency',
  'out',
  'resume',
  'mapping',
  'glob',
] as const;

const BOOLEAN_FLAGS = [
  'version',
  'help',
  'yes',
  'skip-install',
  'latest',
  'dry-run',
] as const;

/**
 * Thin mri wrapper. Keeps the parser generic enough that subcommand-specific
 * flags (e.g. `--target` for `add`, `--timestamp` for `restore`,
 * `--supabase-bucket` for `migrate-supabase`) all live in one table —
 * individual commands pick what they need.
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const raw = mri(argv, {
    boolean: [...BOOLEAN_FLAGS],
    string: [...STRING_FLAGS],
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
    'supabase-url': supabaseUrl,
    'supabase-key': supabaseKey,
    'supabase-bucket': supabaseBucket,
    'uploadkit-key': uploadkitKey,
    'uploadkit-route': uploadkitRoute,
    'uploadkit-api': uploadkitApi,
    prefix,
    concurrency,
    out,
    resume,
    'dry-run': dryRun,
    mapping,
    glob,
    ...extra
  } = raw as Record<string, unknown> & { _: unknown[] };

  const concurrencyNum =
    typeof concurrency === 'string' ? Number.parseInt(concurrency, 10) : undefined;

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
      supabaseUrl: typeof supabaseUrl === 'string' ? supabaseUrl : undefined,
      supabaseKey: typeof supabaseKey === 'string' ? supabaseKey : undefined,
      supabaseBucket: typeof supabaseBucket === 'string' ? supabaseBucket : undefined,
      uploadkitKey: typeof uploadkitKey === 'string' ? uploadkitKey : undefined,
      uploadkitRoute: typeof uploadkitRoute === 'string' ? uploadkitRoute : undefined,
      uploadkitApi: typeof uploadkitApi === 'string' ? uploadkitApi : undefined,
      prefix: typeof prefix === 'string' ? prefix : undefined,
      concurrency:
        concurrencyNum === undefined || Number.isNaN(concurrencyNum) ? undefined : concurrencyNum,
      out: typeof out === 'string' ? out : undefined,
      resume: typeof resume === 'string' ? resume : undefined,
      dryRun: Boolean(dryRun),
      mapping: typeof mapping === 'string' ? mapping : undefined,
      glob: typeof glob === 'string' ? glob : undefined,
      extra,
    },
  };
}
