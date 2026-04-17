import { UploadKitClient } from './client';
import type { UploadKitConfig } from './types';

// Factory function — preferred entry point for SDK consumers
export function createUploadKit(config: UploadKitConfig): UploadKitClient {
  return new UploadKitClient(config);
}

// Re-export all public types (named exports only — no default exports per convention)
export type {
  UploadKitConfig,
  UploadOptions,
  UploadResult,
  ListFilesOptions,
  ListFilesResult,
  UploadRequestResponse,
  MultipartInitResponse,
} from './types';

// Re-export UploadKitError for SDK consumers to use in catch blocks
export { UploadKitError } from '@uploadkitdev/shared';

// Re-export the client class for advanced use cases
export { UploadKitClient } from './client';

// Proxy client — browser-safe, never handles an API key
export { ProxyUploadKitClient, createProxyClient } from './proxy-client';
export type { ProxyClientConfig, ProxyUploadOptions, ProgressGranularity } from './proxy-client';

// Package version constant
export const VERSION = '0.2.1';
