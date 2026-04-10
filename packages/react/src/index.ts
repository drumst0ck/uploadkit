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

// Motion & progress variants (quick task 260410-kw3)
export { UploadProgressRadial } from './components/upload-progress-radial';
export type { UploadProgressRadialProps } from './components/upload-progress-radial';
export { UploadProgressBar } from './components/upload-progress-bar';
export type { UploadProgressBarProps } from './components/upload-progress-bar';
export { UploadProgressStacked } from './components/upload-progress-stacked';
export type { UploadProgressStackedProps } from './components/upload-progress-stacked';
export { UploadProgressOrbit } from './components/upload-progress-orbit';
export type { UploadProgressOrbitProps } from './components/upload-progress-orbit';
export { UploadCloudRain } from './components/upload-cloud-rain';
export type { UploadCloudRainProps } from './components/upload-cloud-rain';
export { UploadBento } from './components/upload-bento';
export type { UploadBentoProps } from './components/upload-bento';
export { UploadParticles } from './components/upload-particles';
export type { UploadParticlesProps } from './components/upload-particles';
export { UploadStepWizard } from './components/upload-step-wizard';
export type { UploadStepWizardProps } from './components/upload-step-wizard';

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
