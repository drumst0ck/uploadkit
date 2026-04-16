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

// Premium dropzone variants
export { UploadDropzoneGlass } from './components/upload-dropzone-glass';
export type { UploadDropzoneGlassProps } from './components/upload-dropzone-glass';
export { UploadDropzoneAurora } from './components/upload-dropzone-aurora';
export type { UploadDropzoneAuroraProps } from './components/upload-dropzone-aurora';
export { UploadDropzoneTerminal } from './components/upload-dropzone-terminal';
export type { UploadDropzoneTerminalProps } from './components/upload-dropzone-terminal';
export { UploadDropzoneBrutal } from './components/upload-dropzone-brutal';
export type { UploadDropzoneBrutalProps } from './components/upload-dropzone-brutal';
export { UploadDropzoneMinimal } from './components/upload-dropzone-minimal';
export type { UploadDropzoneMinimalProps } from './components/upload-dropzone-minimal';
export { UploadDropzoneNeon } from './components/upload-dropzone-neon';
export type { UploadDropzoneNeonProps } from './components/upload-dropzone-neon';

// Premium button variants
export { UploadButtonShimmer } from './components/upload-button-shimmer';
export type { UploadButtonShimmerProps } from './components/upload-button-shimmer';
export { UploadButtonMagnetic } from './components/upload-button-magnetic';
export type { UploadButtonMagneticProps } from './components/upload-button-magnetic';
export { UploadButtonPulse } from './components/upload-button-pulse';
export type { UploadButtonPulseProps } from './components/upload-button-pulse';
export { UploadButtonGradient } from './components/upload-button-gradient';
export type { UploadButtonGradientProps } from './components/upload-button-gradient';
export { UploadButtonBeam } from './components/upload-button-beam';
export type { UploadButtonBeamProps } from './components/upload-button-beam';

// Specialty components
export { UploadAvatar } from './components/upload-avatar';
export type { UploadAvatarProps } from './components/upload-avatar';
export { UploadInlineChat } from './components/upload-inline-chat';
export type { UploadInlineChatProps } from './components/upload-inline-chat';

// Motion & progress variants
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
export { UploadProgressWave } from './components/upload-progress-wave';
export type { UploadProgressWaveProps } from './components/upload-progress-wave';
export { UploadProgressLiquid } from './components/upload-progress-liquid';
export type { UploadProgressLiquidProps } from './components/upload-progress-liquid';

// Multi-file visualizers
export { UploadGalleryGrid } from './components/upload-gallery-grid';
export type { UploadGalleryGridProps } from './components/upload-gallery-grid';
export { UploadTimeline } from './components/upload-timeline';
export type { UploadTimelineProps } from './components/upload-timeline';

// Multi-file visualizers (continued)
export { UploadPolaroid } from './components/upload-polaroid';
export type { UploadPolaroidProps } from './components/upload-polaroid';
export { UploadKanban } from './components/upload-kanban';
export type { UploadKanbanProps } from './components/upload-kanban';
export { UploadStickyBoard } from './components/upload-sticky-board';
export type { UploadStickyBoardProps } from './components/upload-sticky-board';

// Specialty components (continued)
export { UploadSourceTabs } from './components/upload-source-tabs';
export type { UploadSourceTabsProps } from './components/upload-source-tabs';
export { UploadEnvelope } from './components/upload-envelope';
export type { UploadEnvelopeProps } from './components/upload-envelope';
export { UploadBlueprint } from './components/upload-blueprint';
export type { UploadBlueprintProps } from './components/upload-blueprint';
export { UploadVinyl } from './components/upload-vinyl';
export type { UploadVinylProps } from './components/upload-vinyl';
export { UploadDataStream } from './components/upload-data-stream';
export type { UploadDataStreamProps } from './components/upload-data-stream';
export { UploadAttachmentTray } from './components/upload-attachment-tray';
export type { UploadAttachmentTrayProps } from './components/upload-attachment-tray';
export { UploadScannerFrame } from './components/upload-scanner-frame';
export type { UploadScannerFrameProps } from './components/upload-scanner-frame';
export { UploadBookFlip } from './components/upload-book-flip';
export type { UploadBookFlipProps } from './components/upload-book-flip';

// Border beam effect
export { UploadBeam } from './components/upload-beam';
export type { UploadBeamProps, UploadBeamState } from './components/upload-beam';

// Floating upload manager
export { UploadNotificationPanel } from './components/upload-notification-panel';
export type { UploadNotificationPanelProps, UploadNotificationPanelHandle } from './components/upload-notification-panel';

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
export { ProxyUploadKitClient } from '@uploadkitdev/core';

// Version
export const VERSION = '0.1.0';
