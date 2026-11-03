// Handler factory
export { createUploadKitHandler } from './handler';

// SSR Plugin for Next.js App Router
export { NextSSRPlugin, extractRouterConfig } from './ssr-plugin';

// Real React helper forwarding; the build preserves its client-module boundary.
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
