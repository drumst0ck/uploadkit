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

// Premium variants (quick task 260410-ju7) — 8 opinionated upload components
export { UploadDropzoneGlass } from './components/upload-dropzone-glass';
export type { UploadDropzoneGlassProps } from './components/upload-dropzone-glass';
export { UploadDropzoneAurora } from './components/upload-dropzone-aurora';
export type { UploadDropzoneAuroraProps } from './components/upload-dropzone-aurora';
export { UploadDropzoneTerminal } from './components/upload-dropzone-terminal';
export type { UploadDropzoneTerminalProps } from './components/upload-dropzone-terminal';
export { UploadDropzoneBrutal } from './components/upload-dropzone-brutal';
export type { UploadDropzoneBrutalProps } from './components/upload-dropzone-brutal';
export { UploadButtonShimmer } from './components/upload-button-shimmer';
export type { UploadButtonShimmerProps } from './components/upload-button-shimmer';
export { UploadButtonMagnetic } from './components/upload-button-magnetic';
export type { UploadButtonMagneticProps } from './components/upload-button-magnetic';
export { UploadAvatar } from './components/upload-avatar';
export type { UploadAvatarProps } from './components/upload-avatar';
export { UploadInlineChat } from './components/upload-inline-chat';
export type { UploadInlineChatProps } from './components/upload-inline-chat';

// Helpers
export { generateReactHelpers } from './helpers';

// Tailwind plugin
export { withUk } from './tailwind';

// Hooks (exported for advanced consumers who want to build custom UI)
export { useDragState } from './hooks/use-drag-state';
export { useAutoDismiss } from './hooks/use-auto-dismiss';
export { useThumbnail } from './hooks/use-thumbnail';

// Types re-exported from core for convenience
export type { UploadResult, ProxyClientConfig } from '@uploadkitdev/core';

// Version
export const VERSION = '0.1.0';
