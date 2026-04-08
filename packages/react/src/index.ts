// Context
export { UploadKitProvider } from './context';
export type { UploadKitProviderProps } from './context';

// Hooks
export { useUploadKit } from './use-upload-kit';

// Components
export { UploadButton } from './components/upload-button';
export type { UploadButtonProps } from './components/upload-button';

// Types re-exported from core for convenience
export type { UploadResult, UploadKitConfig } from '@uploadkit/core';

// Version
export const VERSION = '0.1.0';
