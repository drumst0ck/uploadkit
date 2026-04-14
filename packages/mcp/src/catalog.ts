// Component catalog — sole source of truth for the MCP tools.
// Keep aligned with packages/react/src/index.ts exports.

export type Category =
  | 'classic'
  | 'dropzone'
  | 'button'
  | 'progress'
  | 'motion'
  | 'specialty'
  | 'gallery';

export type ComponentEntry = {
  name: string;
  category: Category;
  description: string;
  inspiration: string;
  usage: string;
};

const base = (name: string) =>
  `import { ${name} } from '@uploadkitdev/react';
import '@uploadkitdev/react/styles.css';

export default function Page() {
  return <${name} route="media" />;
}`;

const baseSizeProp = (name: string, size: number) =>
  `import { ${name} } from '@uploadkitdev/react';
import '@uploadkitdev/react/styles.css';

export default function Page() {
  return <${name} route="avatar" size={${size}} />;
}`;

const baseChat = `import { UploadInlineChat } from '@uploadkitdev/react';
import '@uploadkitdev/react/styles.css';

export default function Page() {
  return (
    <UploadInlineChat
      route="media"
      placeholder="Message anything…"
      onSubmit={(text, files) => console.log(text, files)}
    />
  );
}`;

const baseModal = `import { useState } from 'react';
import { UploadModal } from '@uploadkitdev/react';
import '@uploadkitdev/react/styles.css';

export default function Page() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open modal</button>
      <UploadModal route="media" open={open} onClose={() => setOpen(false)} />
    </>
  );
}`;

export const CATALOG: ComponentEntry[] = [
  // ─── Classics ─────────────────────────────────────────────────────
  {
    name: 'UploadButton',
    category: 'classic',
    description: 'Baseline upload button. Triggers native file picker.',
    inspiration: 'Baseline',
    usage: base('UploadButton'),
  },
  {
    name: 'UploadDropzone',
    category: 'classic',
    description: 'Baseline drag-and-drop dropzone with click-to-browse fallback.',
    inspiration: 'Baseline',
    usage: base('UploadDropzone'),
  },
  {
    name: 'UploadModal',
    category: 'classic',
    description: 'Native <dialog> modal wrapping the dropzone. Controlled via open/onClose.',
    inspiration: 'Native <dialog>',
    usage: baseModal,
  },
  {
    name: 'FileList',
    category: 'classic',
    description: 'Renders uploaded files with status, size, and actions. Headless-friendly.',
    inspiration: 'Baseline',
    usage: `import { FileList, useUploadKit } from '@uploadkitdev/react';

export default function Page() {
  const { files } = useUploadKit('media');
  return <FileList files={files} />;
}`,
  },
  {
    name: 'FilePreview',
    category: 'classic',
    description: 'Client-side preview tile. Canvas thumbnails for images, icon fallback for other types.',
    inspiration: 'Baseline',
    usage: `import { FilePreview } from '@uploadkitdev/react';

export default function Page({ file }: { file: File }) {
  return <FilePreview file={file} />;
}`,
  },

  // ─── Premium dropzones ────────────────────────────────────────────
  {
    name: 'UploadDropzoneGlass',
    category: 'dropzone',
    description: 'Frosted glass surface with indigo halo. Vercel/Linear vibe.',
    inspiration: 'Vercel · Linear — frosted glass + indigo halo',
    usage: base('UploadDropzoneGlass'),
  },
  {
    name: 'UploadDropzoneAurora',
    category: 'dropzone',
    description: 'Animated conic-gradient mesh with cursor-tracking highlight.',
    inspiration: 'Apple · Supabase — animated conic mesh + cursor highlight',
    usage: base('UploadDropzoneAurora'),
  },
  {
    name: 'UploadDropzoneTerminal',
    category: 'dropzone',
    description: 'Monospace terminal prompt with blinking cursor and typewriter feedback.',
    inspiration: 'Raycast · Warp — mono prompt + blinking cursor',
    usage: base('UploadDropzoneTerminal'),
  },
  {
    name: 'UploadDropzoneBrutal',
    category: 'dropzone',
    description: 'Neobrutalist dropzone — thick borders, hard shadows, rotated stamp.',
    inspiration: 'Neobrutalist — thick borders, hard shadows, stamp',
    usage: base('UploadDropzoneBrutal'),
  },
  {
    name: 'UploadDropzoneMinimal',
    category: 'dropzone',
    description: 'Stripped-back dropzone — single line prompt, no decoration.',
    inspiration: 'Stripe · Resend — minimal',
    usage: base('UploadDropzoneMinimal'),
  },
  {
    name: 'UploadDropzoneNeon',
    category: 'dropzone',
    description: 'Neon outline with cyan glow, synthwave aesthetic.',
    inspiration: 'Synthwave · retrowave neon',
    usage: base('UploadDropzoneNeon'),
  },

  // ─── Premium buttons ──────────────────────────────────────────────
  {
    name: 'UploadButtonShimmer',
    category: 'button',
    description: 'Button with animated shimmer sweep and indigo glow.',
    inspiration: 'Vercel · Linear — animated shimmer sweep + glow',
    usage: base('UploadButtonShimmer'),
  },
  {
    name: 'UploadButtonMagnetic',
    category: 'button',
    description: 'Cursor-attracted spring-scaled button. Requires motion peerDep.',
    inspiration: 'Apple — cursor-attracted spring scale',
    usage: base('UploadButtonMagnetic'),
  },
  {
    name: 'UploadButtonPulse',
    category: 'button',
    description: 'Pulsing glow ring on idle — catches attention in empty states.',
    inspiration: 'Onboarding hint',
    usage: base('UploadButtonPulse'),
  },
  {
    name: 'UploadButtonGradient',
    category: 'button',
    description: 'Gradient fill that rotates on hover.',
    inspiration: 'Stripe · Resend — gradient',
    usage: base('UploadButtonGradient'),
  },

  // ─── Specialty ────────────────────────────────────────────────────
  {
    name: 'UploadAvatar',
    category: 'specialty',
    description: 'Circular avatar with SVG progress ring. Crop-to-circle preview.',
    inspiration: 'Circular crop + SVG progress ring',
    usage: baseSizeProp('UploadAvatar', 112),
  },
  {
    name: 'UploadInlineChat',
    category: 'specialty',
    description: 'Inline chat composer with animated file chips — ChatGPT/Linear style.',
    inspiration: 'ChatGPT · Linear — inline composer with animated chips',
    usage: baseChat,
  },
  {
    name: 'UploadAttachmentTray',
    category: 'specialty',
    description: 'Collapsible tray of file attachments — email composer style.',
    inspiration: 'Gmail · Superhuman — attachment tray',
    usage: base('UploadAttachmentTray'),
  },
  {
    name: 'UploadNotificationPanel',
    category: 'specialty',
    description: 'Toast-style upload feedback panel, bottom-right.',
    inspiration: 'macOS Finder · Dropbox sync tray',
    usage: base('UploadNotificationPanel'),
  },
  {
    name: 'UploadSourceTabs',
    category: 'specialty',
    description: 'Tabbed selector (local, URL, camera) around a dropzone.',
    inspiration: 'Google Drive · Notion — source picker',
    usage: base('UploadSourceTabs'),
  },
  {
    name: 'UploadStepWizard',
    category: 'specialty',
    description: 'Multi-step wizard: pick → preview → confirm.',
    inspiration: 'Stripe Checkout · Apple Pay add card',
    usage: base('UploadStepWizard'),
  },
  {
    name: 'UploadScannerFrame',
    category: 'specialty',
    description: 'Document-scanner frame with animated laser line.',
    inspiration: 'Notes · Adobe Scan',
    usage: base('UploadScannerFrame'),
  },
  {
    name: 'UploadEnvelope',
    category: 'specialty',
    description: '3D envelope that opens on drop — send-file metaphor.',
    inspiration: 'WeTransfer · Firefox Send',
    usage: base('UploadEnvelope'),
  },
  {
    name: 'UploadBookFlip',
    category: 'specialty',
    description: 'Page-flip book animation for paginated file collections.',
    inspiration: 'Apple Books · Issuu',
    usage: base('UploadBookFlip'),
  },
  {
    name: 'UploadVinyl',
    category: 'specialty',
    description: 'Spinning vinyl record — audio-file upload flavour.',
    inspiration: 'Apple Music · Spotify',
    usage: base('UploadVinyl'),
  },
  {
    name: 'UploadBlueprint',
    category: 'specialty',
    description: 'Blueprint-grid schematic dropzone for technical-product vibes.',
    inspiration: 'Figma · Linear schematics',
    usage: base('UploadBlueprint'),
  },

  // ─── Progress ─────────────────────────────────────────────────────
  {
    name: 'UploadProgressRadial',
    category: 'progress',
    description: 'Circular progress ring, Apple Health style.',
    inspiration: 'Linear attachments · Apple Health activity ring',
    usage: base('UploadProgressRadial'),
  },
  {
    name: 'UploadProgressBar',
    category: 'progress',
    description: 'Horizontal linear progress bar with ETA.',
    inspiration: 'Vercel build logs · Linear CI bars',
    usage: base('UploadProgressBar'),
  },
  {
    name: 'UploadProgressStacked',
    category: 'progress',
    description: 'Multiple stacked bars for simultaneous multi-file uploads.',
    inspiration: 'iOS AirDrop · Telegram multi-send',
    usage: base('UploadProgressStacked'),
  },
  {
    name: 'UploadProgressOrbit',
    category: 'progress',
    description: 'Orbital dots circling a central cloud glyph.',
    inspiration: 'Arc browser · Raycast command palette',
    usage: base('UploadProgressOrbit'),
  },
  {
    name: 'UploadProgressLiquid',
    category: 'progress',
    description: 'Liquid-fill SVG wave that rises with progress.',
    inspiration: 'Duolingo · habit trackers',
    usage: base('UploadProgressLiquid'),
  },
  {
    name: 'UploadProgressWave',
    category: 'progress',
    description: 'Sinusoidal wave with amplitude mapped to throughput.',
    inspiration: 'Apple Voice Memos · GarageBand',
    usage: base('UploadProgressWave'),
  },

  // ─── Motion / Visual ──────────────────────────────────────────────
  {
    name: 'UploadCloudRain',
    category: 'motion',
    description: 'Animated cloud with falling droplets, throughput-reactive.',
    inspiration: 'iCloud sync · Dropbox onboarding',
    usage: base('UploadCloudRain'),
  },
  {
    name: 'UploadBento',
    category: 'motion',
    description: 'Bento-grid dropzone that rearranges tiles on drop.',
    inspiration: 'Apple iPadOS widgets · Raycast themes grid',
    usage: base('UploadBento'),
  },
  {
    name: 'UploadParticles',
    category: 'motion',
    description: '3D particle field that reacts to upload progress.',
    inspiration: 'Stripe 3DS loading · Vercel Ship hero',
    usage: base('UploadParticles'),
  },
  {
    name: 'UploadDataStream',
    category: 'motion',
    description: 'Matrix/Warp-inspired vertical character streams that accelerate with upload throughput.',
    inspiration: 'The Matrix · Warp terminal',
    usage: `import { UploadDataStream } from '@uploadkitdev/react';
import '@uploadkitdev/react/styles.css';

export default function Page() {
  return <UploadDataStream route="media" columns={20} />;
}`,
  },
  {
    name: 'UploadParticles',
    category: 'motion',
    description: 'Particle-swarm visualization during upload.',
    inspiration: 'Stripe 3DS · Apple WWDC hero',
    usage: base('UploadParticles'),
  },

  // ─── Galleries ────────────────────────────────────────────────────
  {
    name: 'UploadGalleryGrid',
    category: 'gallery',
    description: 'Masonry/responsive grid of uploaded images with lightbox.',
    inspiration: 'Unsplash · Pinterest',
    usage: base('UploadGalleryGrid'),
  },
  {
    name: 'UploadPolaroid',
    category: 'gallery',
    description: 'Polaroid-card gallery with subtle rotations.',
    inspiration: 'Instax · scrapbook',
    usage: base('UploadPolaroid'),
  },
  {
    name: 'UploadTimeline',
    category: 'gallery',
    description: 'Vertical timeline grouping uploads by date.',
    inspiration: 'Linear · Notion timeline',
    usage: base('UploadTimeline'),
  },
  {
    name: 'UploadKanban',
    category: 'gallery',
    description: 'Kanban columns (uploading / done / failed) — drag between.',
    inspiration: 'Linear · Trello',
    usage: base('UploadKanban'),
  },
  {
    name: 'UploadStickyBoard',
    category: 'gallery',
    description: 'Sticky-note corkboard of file cards, draggable.',
    inspiration: 'FigJam · Miro',
    usage: base('UploadStickyBoard'),
  },
];
