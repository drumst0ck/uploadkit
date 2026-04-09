// Handler factory
export { createUploadKitHandler } from './handler';

// SSR Plugin for Next.js App Router
export { NextSSRPlugin, extractRouterConfig } from './ssr-plugin';

// React helpers type stub (real implementation in @uploadkitdev/react)
export { generateReactHelpers } from './helpers';

// Types
export type {
  FileRouter,
  RouteConfig,
  S3CompatibleStorage,
  UploadedFile,
  UploadKitHandlerConfig,
} from './types';

// Utilities
export { parseFileSize } from './router';
