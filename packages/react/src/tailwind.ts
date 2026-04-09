type TailwindConfig = {
  content?: string[] | { relative?: boolean; files: string[] } | unknown;
  plugins?: unknown[];
  [key: string]: unknown;
};

/**
 * withUk — wraps a Tailwind config to add UploadKit-specific variants and content paths.
 *
 * Usage (tailwind.config.ts):
 * ```ts
 * import { withUk } from '@uploadkit/react/tailwind';
 * export default withUk({ content: ['./src/**\/*.tsx'] });
 * ```
 *
 * Adds these Tailwind variants:
 * - uk-button, uk-container, uk-label, uk-upload-icon, uk-allowed-content
 * - uk-file-item, uk-progress-bar, uk-preview, uk-modal, uk-submit
 * - uk-ready, uk-idle, uk-uploading, uk-success, uk-error, uk-dragging
 */
export function withUk(config: TailwindConfig): TailwindConfig {
  const existingContent = Array.isArray(config.content) ? config.content : [];

  return {
    ...config,
    content: [
      ...existingContent,
      'node_modules/@uploadkit/react/dist/**/*.{js,mjs}',
    ],
    plugins: [
      ...(config.plugins ?? []),
      function uploadKitPlugin({ addVariant }: { addVariant: (name: string, definition: string) => void }) {
        // Element variants — target specific UploadKit elements by data-uk-element
        addVariant('uk-button', '&[data-uk-element="button"]');
        addVariant('uk-container', '&[data-uk-element="container"]');
        addVariant('uk-label', '&[data-uk-element="label"]');
        addVariant('uk-upload-icon', '&[data-uk-element="upload-icon"]');
        addVariant('uk-allowed-content', '&[data-uk-element="allowed-content"]');
        addVariant('uk-file-item', '&[data-uk-element="file-item"]');
        addVariant('uk-progress-bar', '&[data-uk-element="progress-bar"]');
        addVariant('uk-preview', '&[data-uk-element="preview"]');
        addVariant('uk-modal', '&[data-uk-element="modal"]');
        addVariant('uk-submit', '&[data-uk-element="submit-button"]');
        // State variants — target elements by data-state
        addVariant('uk-ready', '&[data-state="ready"]');
        addVariant('uk-idle', '&[data-state="idle"]');
        addVariant('uk-uploading', '&[data-state="uploading"]');
        addVariant('uk-success', '&[data-state="success"]');
        addVariant('uk-error', '&[data-state="error"]');
        addVariant('uk-dragging', '&[data-state="dragging"]');
      },
    ],
  };
}
