/**
 * Shared types for the migrate-supabase command. Kept in one file so the
 * command module, supabase client, uploadkit client, and state module all
 * agree on shapes.
 */

/** Single entry in the persisted migration mapping. */
export interface MigrationEntry {
  /** Supabase public URL — the URL currently stored in user's DB/code. */
  oldUrl: string;
  /** UploadKit CDN URL — the replacement URL. */
  newUrl: string;
  /** Object key within the Supabase bucket (e.g. `avatars/me.png`). */
  key: string;
  /** Object size in bytes. */
  size: number;
  /** MIME type sniffed from HEAD or declared by Supabase metadata. */
  contentType: string;
  /** ISO timestamp when migration completed for this object. */
  migratedAt: string;
}

/** Per-object failure record — used to build the final summary. */
export interface MigrationFailure {
  key: string;
  oldUrl: string;
  /** Stage where the failure occurred. */
  stage: 'head' | 'request' | 'put' | 'complete';
  message: string;
}

/** On-disk shape of the mapping file. */
export interface MigrationState {
  /** Schema version — bump if the shape changes in a backwards-incompatible way. */
  version: 1;
  /** When this migration run started. */
  startedAt: string;
  /** Supabase bucket name. */
  bucket: string;
  /** UploadKit route slug files were uploaded to. */
  route: string;
  /** Successfully migrated entries. */
  entries: MigrationEntry[];
  /** Failures from the latest run. Reset on each successful resume. */
  failures: MigrationFailure[];
}

/** Object emitted by the Supabase list API. */
export interface SupabaseObject {
  /** Full object key (path included). */
  name: string;
  /** Object id (UUID). */
  id: string;
  /** Last-modified ISO string. */
  updated_at?: string;
  /** Created ISO string. */
  created_at?: string;
  /** Size + mimetype from Supabase metadata. */
  metadata?: {
    size?: number;
    mimetype?: string;
    cacheControl?: string;
    eTag?: string;
    lastModified?: string;
  };
}

/** Resolved configuration after merging flags, env, and prompts. */
export interface MigrationConfig {
  supabaseUrl: string;
  supabaseKey: string;
  supabaseBucket: string;
  uploadkitApi: string;
  uploadkitKey: string;
  uploadkitRoute: string;
  prefix: string | undefined;
  concurrency: number;
  outPath: string;
  resumePath: string | undefined;
  dryRun: boolean;
  yes: boolean;
}
