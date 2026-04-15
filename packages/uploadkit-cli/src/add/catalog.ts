/**
 * Component catalog for `uploadkit add <component>` — per D-09.
 *
 * Each canonical alias maps to a named export from `@uploadkitdev/react`.
 * The exports were verified against packages/react/src/index.ts at the time
 * this catalog was written (plan 12.5-06). If an SDK export is renamed, update
 * the `import` field here and keep the alias stable — users' muscle memory
 * lives in the alias, not in the underlying component name.
 *
 * No cropper alias ships in this iteration — the SDK does not yet export a
 * cropper component. The alias can be added later when one lands.
 */
export interface ComponentSpec {
  /** Named import from the `pkg` module. */
  import: string;
  /** Source package (runtime SDK, not this CLI). */
  pkg: string;
}

export const COMPONENTS = {
  dropzone: { import: 'UploadDropzone', pkg: '@uploadkitdev/react' },
  button: { import: 'UploadButton', pkg: '@uploadkitdev/react' },
  modal: { import: 'UploadModal', pkg: '@uploadkitdev/react' },
  gallery: { import: 'UploadGalleryGrid', pkg: '@uploadkitdev/react' },
  queue: { import: 'FileList', pkg: '@uploadkitdev/react' },
  progress: { import: 'UploadProgressBar', pkg: '@uploadkitdev/react' },
} as const satisfies Record<string, ComponentSpec>;

export type ComponentAlias = keyof typeof COMPONENTS;

/** Canonical list of aliases (array form for listings + prompts). */
export const COMPONENT_ALIASES = Object.keys(COMPONENTS) as ComponentAlias[];

/** Type-narrowing guard: returns true iff `s` is a known alias. */
export function isComponentAlias(s: string): s is ComponentAlias {
  return Object.prototype.hasOwnProperty.call(COMPONENTS, s);
}
