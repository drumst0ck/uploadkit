/**
 * Catalog of every component exported from packages/react/src/index.ts (44).
 * Descriptions are derived from each source file's header comment / JSDoc in
 * packages/react/src/components. Aliases come from
 * packages/uploadkit-cli/src/add/catalog.ts (COMPONENTS).
 */

export interface CatalogEntry {
  /** Named export from @uploadkitdev/react. */
  name: string
  /** One-line factual description. */
  description: string
  /** `npx uploadkit add <alias>` alias, when the CLI ships one. */
  alias?: string
  /** Slug of the reference page (omitted when no page exists) under docs.uploadkit.dev/docs/sdk/react/. */
  docs?: string
}

export interface CatalogGroup {
  id: string
  title: string
  lead: string
  entries: CatalogEntry[]
}

export const DOCS_BASE = 'https://docs.uploadkit.dev/docs/sdk/react/'

export const CATALOG: CatalogGroup[] = [
  {
    id: 'core',
    title: 'Core components',
    lead: 'The building blocks most apps start with: a button, a dropzone, a modal, and the file list and preview pieces they share.',
    entries: [
      { name: 'UploadButton', alias: 'button', docs: 'upload-button', description: 'A styled button that opens the file picker and shows upload progress; it goes idle, uploading with a percentage, then success.' },
      { name: 'UploadDropzone', alias: 'dropzone', docs: 'upload-dropzone', description: 'A drag-and-drop zone with multi-file support, per-file progress bars and auto-dismissing error toasts.' },
      { name: 'UploadModal', alias: 'modal', docs: 'upload-modal', description: 'A modal overlay for uploads built on the native <dialog> element; it closes on ESC or a backdrop click.' },
      { name: 'FileList', alias: 'queue', docs: 'file-list', description: 'Lists completed uploads with a preview, name, size and type, plus an optional delete button when you pass onDelete.' },
      { name: 'FilePreview', docs: 'file-preview', description: 'Renders a 48×48 thumbnail: the stored URL for uploaded files, a blob URL for images, the first frame for videos, a type icon otherwise.' },
    ],
  },
  {
    id: 'dropzones',
    title: 'Dropzone styles',
    lead: 'Alternative looks for the drag-and-drop surface. Each is a dropzone with its own visual language and CSS variables.',
    entries: [
      { name: 'UploadDropzoneGlass', alias: 'dropzone-glass', docs: 'upload-dropzone-glass', description: 'Frosted glass surface with hairline borders and an indigo glow halo on drag-over; uploads files in parallel.' },
      { name: 'UploadDropzoneAurora', alias: 'dropzone-aurora', docs: 'upload-dropzone-aurora', description: 'Animated conic-gradient mesh with a cursor-following specular highlight; CSS keyframes are the static fallback.' },
      { name: 'UploadDropzoneTerminal', docs: 'upload-dropzone-terminal', description: 'Monospace prompt with a blinking cursor and a tail-style log of accepted files.' },
      { name: 'UploadDropzoneBrutal', docs: 'upload-dropzone-brutal', description: 'Neobrutalist dropzone with thick borders, a hard offset shadow and a stamp animation on drop.' }, // taste-skill-ignore: factual SDK description, not a style on this site
      { name: 'UploadDropzoneMinimal', alias: 'dropzone-minimal', docs: 'upload-dropzone-minimal', description: 'Whitespace-heavy dropzone with 1px borders, one accent color, no gradients or shadows, and file chips that fade in.' },
      { name: 'UploadDropzoneNeon', alias: 'dropzone-neon', docs: 'upload-dropzone-neon', description: 'Synthwave style with a neon border glow on drag-over, a scanline overlay and sharp corners; uploads three files at a time.' },
      { name: 'UploadBlueprint', docs: 'upload-blueprint', description: 'Engineering-blueprint dropzone: dark blue background, white grid lines, crosshair markers and printout-style file readouts.' },
    ],
  },
  {
    id: 'buttons',
    title: 'Button styles',
    lead: 'Upload buttons that share the UploadButton props and change the visual treatment.',
    entries: [
      { name: 'UploadButtonShimmer', alias: 'button-shimmer', docs: 'upload-button-shimmer', description: 'Call-to-action button with a shimmer sweep and glow on hover; falls back to static keyframes when Motion is missing.' },
      { name: 'UploadButtonMagnetic', docs: 'upload-button-magnetic', description: 'Button that is pulled toward the cursor with a Motion spring; falls back to a CSS hover scale without Motion.' },
      { name: 'UploadButtonPulse', docs: 'upload-button-pulse', description: 'Calm button with a soft radial pulse while idle and a squeeze on press; static CSS keyframes when Motion is unavailable or reduced motion is preferred.' },
      { name: 'UploadButtonGradient', docs: 'upload-button-gradient', description: 'Dark button wrapped in a continuously spinning conic-gradient border.' },
      { name: 'UploadButtonBeam', alias: 'button-beam', docs: 'upload-button-beam', description: 'Button whose animated border beam activates automatically during uploads, with no beam prop to toggle.' },
    ],
  },
  {
    id: 'progress',
    title: 'Progress and motion',
    lead: 'Components that put upload progress at the center of the visual.',
    entries: [
      { name: 'UploadProgressBar', alias: 'progress', docs: 'upload-progress-bar', description: 'Horizontal button with a progress bar, a shimmer sweep and an indeterminate sliding state.' },
      { name: 'UploadProgressRadial', alias: 'progress-radial', docs: 'upload-progress-radial', description: 'Activity-ring progress: click to pick a file, the ring fills as it uploads and splashes on success.' },
      { name: 'UploadProgressStacked', docs: 'upload-progress-stacked', description: 'Multi-file vertical list with a progress bar and percentage per row; finished rows float to the top when Motion is available.' },
      { name: 'UploadProgressOrbit', docs: 'upload-progress-orbit', description: 'Circular orbit with one satellite per in-flight file that collapses toward the center as its upload completes.' },
      { name: 'UploadProgressWave', docs: 'upload-progress-wave', description: 'Single-file progress shown as a row of waveform-style bars (24 by default) that fill left to right.' },
      { name: 'UploadProgressLiquid', docs: 'upload-progress-liquid', description: 'Single-file progress where an SVG liquid surface with two sine-wave layers rises inside a rounded container.' },
      { name: 'UploadCloudRain', docs: 'upload-cloud-rain', description: 'Cloud icon with droplets falling into it as files are dropped; aggregate progress fills the cloud bottom to top.' },
      { name: 'UploadParticles', docs: 'upload-particles', description: 'Constellation of particles that converge toward the center as progress advances, built with CSS transforms only.' },
      { name: 'UploadDataStream', docs: 'upload-data-stream', description: 'Terminal-style rain of characters in vertical columns (20 by default) that brightens and speeds up with progress and tracks throughput.' },
    ],
  },
  {
    id: 'galleries',
    title: 'Galleries, boards and multi-file views',
    lead: 'Ways to show many files at once while they upload.',
    entries: [
      { name: 'UploadGalleryGrid', alias: 'gallery', docs: 'upload-gallery-grid', description: 'Responsive image grid (3 columns by default, image/* accepted) with live thumbnails and a circular progress ring per cell.' },
      { name: 'UploadTimeline', alias: 'timeline', docs: 'upload-timeline', description: 'Vertical activity-feed timeline with a node per file showing status, name, size, progress and timestamp.' },
      { name: 'UploadPolaroid', alias: 'polaroid', docs: 'upload-polaroid', description: 'Images appear as stacked, slightly rotated polaroid cards that "develop" from white to the real image.' },
      { name: 'UploadKanban', alias: 'kanban', docs: 'upload-kanban', description: 'Files move through Queued, Uploading and Complete columns (plus Error), with cross-column transitions when Motion is available.' },
      { name: 'UploadStickyBoard', docs: 'upload-sticky-board', description: 'Each uploaded file becomes a pastel, slightly rotated sticky note on a corkboard with a progress bar along the bottom edge.' },
      { name: 'UploadBento', docs: 'upload-bento', description: 'CSS grid bento layout where every third cell spans two columns and each cell is a mini upload card.' },
      { name: 'UploadAttachmentTray', docs: 'upload-attachment-tray', description: 'Horizontally scrollable tray of 72×72 attachment cards with thumbnail, progress ring and remove button, plus an attach button.' },
    ],
  },
  {
    id: 'specialty',
    title: 'Specialty components',
    lead: 'Single-purpose pieces for avatars, cropping, chat inputs, document flows and upload management.',
    entries: [
      { name: 'UploadAvatar', alias: 'avatar', docs: 'upload-avatar', description: 'Circular avatar uploader with a blur-up preview and an SVG progress ring.' },
      { name: 'UploadCropper', alias: 'cropper', description: 'Canvas-based image cropper with a configurable aspect ratio (1 by default) that uploads the crop as a JPEG file.' },
      { name: 'UploadInlineChat', docs: 'upload-inline-chat', description: 'Chat-composer attach pattern with chip previews that expand and collapse and several parallel uploads.' },
      { name: 'UploadStepWizard', alias: 'wizard', docs: 'upload-step-wizard', description: 'Five-stage single-file wizard: select, preview, confirm, upload, done.' },
      { name: 'UploadSourceTabs', docs: 'upload-source-tabs', description: 'Compact card with Device, URL and Clipboard tabs; the URL tab fetches the remote file as a Blob before uploading it.' },
      { name: 'UploadEnvelope', alias: 'envelope', docs: 'upload-envelope', description: 'SVG envelope whose flap opens on drag or upload and that shows a wax seal when the upload completes.' },
      { name: 'UploadVinyl', docs: 'upload-vinyl', description: 'Vinyl record that fills with color as the upload progresses while a tonearm swings inward.' },
      { name: 'UploadScannerFrame', docs: 'upload-scanner-frame', description: 'Document-scanner viewfinder with L-shaped corner brackets and a sweeping scan line; image/* is accepted by default.' },
      { name: 'UploadBookFlip', docs: 'upload-book-flip', description: '3D book with a page-flip animation during upload, narrated as "page N of M".' },
      { name: 'UploadBeam', docs: 'upload-beam', description: 'Border-beam wrapper animated with a CSS conic gradient; takes a state (idle, uploading, complete, error) or an active boolean and wraps any child.' },
      { name: 'UploadNotificationPanel', docs: 'upload-notification-panel', description: 'Inline 320px upload manager with a "+" picker and drag-and-drop; runs up to 3 uploads at once and dismisses finished files after 3 seconds.' },
    ],
  },
]

export const COMPONENT_COUNT = CATALOG.reduce((n, g) => n + g.entries.length, 0)
