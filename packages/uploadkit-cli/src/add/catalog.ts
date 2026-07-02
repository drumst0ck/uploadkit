/**
 * Component catalog for `uploadkit add <component>`.
 * Aliases map to named exports from `@uploadkitdev/react`.
 */
export interface ComponentSpec {
  import: string;
  pkg: string;
}

export const COMPONENTS = {
  dropzone: { import: 'UploadDropzone', pkg: '@uploadkitdev/react' },
  button: { import: 'UploadButton', pkg: '@uploadkitdev/react' },
  modal: { import: 'UploadModal', pkg: '@uploadkitdev/react' },
  gallery: { import: 'UploadGalleryGrid', pkg: '@uploadkitdev/react' },
  queue: { import: 'FileList', pkg: '@uploadkitdev/react' },
  progress: { import: 'UploadProgressBar', pkg: '@uploadkitdev/react' },
  cropper: { import: 'UploadCropper', pkg: '@uploadkitdev/react' },
  avatar: { import: 'UploadAvatar', pkg: '@uploadkitdev/react' },
  'dropzone-glass': { import: 'UploadDropzoneGlass', pkg: '@uploadkitdev/react' },
  'dropzone-aurora': { import: 'UploadDropzoneAurora', pkg: '@uploadkitdev/react' },
  'dropzone-neon': { import: 'UploadDropzoneNeon', pkg: '@uploadkitdev/react' },
  'dropzone-minimal': { import: 'UploadDropzoneMinimal', pkg: '@uploadkitdev/react' },
  'button-shimmer': { import: 'UploadButtonShimmer', pkg: '@uploadkitdev/react' },
  'button-beam': { import: 'UploadButtonBeam', pkg: '@uploadkitdev/react' },
  'progress-radial': { import: 'UploadProgressRadial', pkg: '@uploadkitdev/react' },
  timeline: { import: 'UploadTimeline', pkg: '@uploadkitdev/react' },
  kanban: { import: 'UploadKanban', pkg: '@uploadkitdev/react' },
  polaroid: { import: 'UploadPolaroid', pkg: '@uploadkitdev/react' },
  wizard: { import: 'UploadStepWizard', pkg: '@uploadkitdev/react' },
  envelope: { import: 'UploadEnvelope', pkg: '@uploadkitdev/react' },
} as const satisfies Record<string, ComponentSpec>;

export type ComponentAlias = keyof typeof COMPONENTS;

export const COMPONENT_ALIASES = Object.keys(COMPONENTS) as ComponentAlias[];

export function isComponentAlias(s: string): s is ComponentAlias {
  return Object.prototype.hasOwnProperty.call(COMPONENTS, s);
}
