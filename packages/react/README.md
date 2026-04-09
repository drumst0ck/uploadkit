# @uploadkitdev/react

[![npm version](https://img.shields.io/npm/v/@uploadkitdev/react)](https://www.npmjs.com/package/@uploadkitdev/react)
[![npm downloads](https://img.shields.io/npm/dm/@uploadkitdev/react)](https://www.npmjs.com/package/@uploadkitdev/react)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/uploadkit/uploadkit/actions/workflows/ci.yml/badge.svg)](https://github.com/uploadkit/uploadkit/actions/workflows/ci.yml)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/@uploadkitdev/react)](https://bundlephobia.com/package/@uploadkitdev/react)

Premium React upload components for UploadKit.

## Features

- **UploadButton** — one-click file picker with built-in progress indicator
- **UploadDropzone** — drag-and-drop upload area with visual feedback
- **UploadModal** — full-featured upload dialog with file list management
- **FileList** — paginated file browser with sort and search
- **FilePreview** — image thumbnail generation via canvas, fallback for non-images
- **CSS theming** — override any token via `--uk-*` custom properties
- **Dark mode** — first-class dark mode support, no JavaScript required
- **Accessible** — WCAG 2.1 AA, keyboard navigation, `aria` attributes throughout

## Install

```bash
# npm
npm install @uploadkitdev/react

# pnpm
pnpm add @uploadkitdev/react

# yarn
yarn add @uploadkitdev/react
```

**Peer dependencies:** `react >= 18`, `react-dom >= 18`

Import the stylesheet in your app's root:

```typescript
import '@uploadkitdev/react/styles.css';
```

## Quickstart

```typescript
import { UploadKitProvider, UploadButton } from '@uploadkitdev/react';
import '@uploadkitdev/react/styles.css';

export function App() {
  return (
    <UploadKitProvider apiKey="uk_live_..." endpoint="/api/upload">
      <UploadButton
        route="imageUploader"
        onUploadComplete={(result) => {
          console.log('Uploaded:', result.url);
        }}
        onUploadError={(error) => {
          console.error(error.message);
        }}
      />
    </UploadKitProvider>
  );
}
```

## Components

| Component | Description |
|-----------|-------------|
| `UploadKitProvider` | Context provider — wrap your app or upload section once |
| `UploadButton` | Button that opens the file picker and uploads on selection |
| `UploadDropzone` | Drag-and-drop area; click to browse files |
| `UploadModal` | Full-screen modal with file queue, per-file progress, retry |
| `FileList` | Paginated file browser with search and delete |
| `FilePreview` | Thumbnail for images, icon for other file types |

## Hooks

| Hook | Description |
|------|-------------|
| `useUploadKit()` | Access the `UploadKitClient` instance from context |
| `useDragState()` | Track drag enter/leave without flicker on child elements |
| `useThumbnail(file)` | Generate an object URL thumbnail for a `File` |
| `useAutoDismiss(ms)` | Auto-dismiss state after a delay (for success/error messages) |

## Theming

All visual tokens are CSS custom properties. Override them in your stylesheet:

```css
:root {
  --uk-primary: #6366f1;         /* accent / primary button color */
  --uk-primary-hover: #818cf8;   /* hover state */
  --uk-radius: 8px;              /* border radius for buttons and dropzone */
  --uk-font-family: inherit;     /* inherits your app font by default */
  --uk-surface: #ffffff;         /* component background */
  --uk-surface-hover: #f5f5f5;  /* hover background */
  --uk-text: #111111;            /* primary text */
  --uk-text-muted: #6b6b6b;     /* secondary / muted text */
  --uk-border: rgba(0,0,0,0.08); /* border color */
  --uk-error: #dc2626;           /* error state (WCAG AA on white) */
}
```

Dark mode example:

```css
[data-theme="dark"] {
  --uk-surface: #1a1a1a;
  --uk-surface-hover: #2a2a2a;
  --uk-text: #fafafa;
  --uk-text-muted: #a1a1aa;
  --uk-border: rgba(255,255,255,0.08);
}
```

## Links

- [Full documentation](https://docs.uploadkit.dev)
- [Core SDK — @uploadkitdev/core](https://www.npmjs.com/package/@uploadkitdev/core)
- [Next.js adapter — @uploadkitdev/next](https://www.npmjs.com/package/@uploadkitdev/next)

## License

MIT
