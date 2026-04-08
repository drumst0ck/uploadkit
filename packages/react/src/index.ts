// Context
export { UploadKitProvider } from './context';
export type { UploadKitProviderProps } from './context';

// Hooks
export { useUploadKit } from './use-upload-kit';

// Components
export { UploadButton } from './components/upload-button';
export type { UploadButtonProps } from './components/upload-button';
export { UploadDropzone } from './components/upload-dropzone';
export type { UploadDropzoneProps } from './components/upload-dropzone';
export { UploadModal } from './components/upload-modal';
export type { UploadModalProps } from './components/upload-modal';

// Hooks (exported for advanced consumers who want to build custom UI)
export { useDragState } from './hooks/use-drag-state';
export { useAutoDismiss } from './hooks/use-auto-dismiss';

// Types re-exported from core for convenience
export type { UploadResult, UploadKitConfig } from '@uploadkit/core';

// Version
export const VERSION = '0.1.0';
