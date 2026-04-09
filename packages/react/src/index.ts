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
export { FileList } from './components/file-list';
export type { FileListProps } from './components/file-list';
export { FilePreview } from './components/file-preview';
export type { FilePreviewProps } from './components/file-preview';

// Helpers
export { generateReactHelpers } from './helpers';

// Tailwind plugin
export { withUk } from './tailwind';

// Hooks (exported for advanced consumers who want to build custom UI)
export { useDragState } from './hooks/use-drag-state';
export { useAutoDismiss } from './hooks/use-auto-dismiss';
export { useThumbnail } from './hooks/use-thumbnail';

// Types re-exported from core for convenience
export type { UploadResult, ProxyClientConfig } from '@uploadkit/core';

// Version
export const VERSION = '0.1.0';
