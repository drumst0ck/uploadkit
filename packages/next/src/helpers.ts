import type { FileRouter } from './types';

/**
 * Type-safe React component factory stub for @uploadkit/next.
 *
 * This function provides the TYPE DEFINITION for Phase 4.
 * Phase 5 (@uploadkit/react) replaces this stub with real component implementations.
 *
 * @example
 * // In your server component or layout:
 * import { generateReactHelpers } from '@uploadkit/next';
 * import type { AppFileRouter } from './api/uploadkit/[...uploadkit]/route';
 *
 * export const { UploadButton, UploadDropzone, useUploadKit } = generateReactHelpers<AppFileRouter>();
 */
export function generateReactHelpers<TRouter extends FileRouter>(): {
  UploadButton: React.ComponentType<{ route: keyof TRouter & string; [key: string]: unknown }>;
  UploadDropzone: React.ComponentType<{ route: keyof TRouter & string; [key: string]: unknown }>;
  UploadModal: React.ComponentType<{ route: keyof TRouter & string; [key: string]: unknown }>;
  useUploadKit: (route: keyof TRouter & string) => {
    // file: Blob is used here instead of File to avoid requiring the DOM lib
    // in the library tsconfig. @uploadkit/react replaces this stub with the real type.
    upload: (file: { name: string; size: number; type: string }) => Promise<void>;
    progress: number;
    isUploading: boolean;
    error: Error | null;
  };
} {
  throw new Error(
    'generateReactHelpers requires @uploadkit/react. ' +
    'Install it: pnpm add @uploadkit/react'
  );
}

// Declare React namespace minimally so the type compiles without a React dependency
declare namespace React {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type ComponentType<P = Record<string, unknown>> = (props: P) => any;
}
