export interface UploadedFile {
  id: string;
  key: string;
  name: string;
  size: number;
  type: string;
  url: string;
  metadata?: Record<string, unknown>;
}

export type RouteConfig<TMiddleware extends Record<string, unknown> = Record<string, unknown>> = {
  maxFileSize?: string | number;
  maxFileCount?: number;
  allowedTypes?: string[];
  middleware?: (ctx: { req: Request }) => Promise<TMiddleware> | TMiddleware;
  onUploadComplete?: (args: { file: UploadedFile; metadata: TMiddleware }) => Promise<unknown> | unknown;
};

/**
 * Use `satisfies FileRouter` (not a type annotation) when defining your file router.
 * This preserves the literal route name keys for full TypeScript inference in client components.
 *
 * @example
 * const fileRouter = {
 *   imageUploader: { maxFileSize: '4MB' },
 * } satisfies FileRouter;
 * // typeof fileRouter['imageUploader'] is preserved — 'imageUploader' is a literal key
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FileRouter = Record<string, RouteConfig<any>>;

export interface S3CompatibleStorage {
  /** For R2: https://<account>.r2.cloudflarestorage.com */
  endpoint?: string;
  /** "auto" for R2, or the AWS region */
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export interface UploadKitHandlerConfig<TRouter extends FileRouter> {
  router: TRouter;
  /** API key for managed UploadKit mode — proxies requests to the UploadKit API */
  apiKey?: string;
  /** S3-compatible storage config for BYOS mode */
  storage?: S3CompatibleStorage;
}
