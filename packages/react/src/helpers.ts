import type React from 'react';
import type { FileRouter } from '@uploadkitdev/next';
import { UploadButton } from './components/upload-button';
import { UploadDropzone } from './components/upload-dropzone';
import { UploadModal } from './components/upload-modal';
import { useUploadKit } from './use-upload-kit';
import type { UploadButtonProps } from './components/upload-button';
import type { UploadDropzoneProps } from './components/upload-dropzone';
import type { UploadModalProps } from './components/upload-modal';

/**
 * generateReactHelpers — type-safe factory that constrains the `route` prop
 * to the literal keys defined in your TRouter file router.
 *
 * Usage (canonical import path is @uploadkitdev/react):
 * ```tsx
 * import { generateReactHelpers } from '@uploadkitdev/react';
 * import type { AppFileRouter } from './api/uploadkit/[...uploadkit]/route';
 *
 * export const { UploadButton, UploadDropzone, UploadModal, useUploadKit } =
 *   generateReactHelpers<AppFileRouter>();
 * ```
 *
 * The factory does NOT create wrapper components — it casts the existing
 * components to typed variants where `route` is narrowed to `keyof TRouter & string`.
 * This means zero extra React elements in the tree and full prop-type inference.
 *
 * Design note (REACT-12): The `Omit<Props, 'route'> & { route: keyof TRouter & string }`
 * pattern replaces only the `route` type while preserving all other prop types.
 * The TypeScript assertion is safe — at runtime UploadButton/Dropzone/Modal accept any
 * string route; type narrowing is purely a compile-time constraint.
 */
export function generateReactHelpers<TRouter extends FileRouter>() {
  // Narrow the route prop to the literal keys of TRouter while keeping all other props.
  type TypedButtonProps = Omit<UploadButtonProps, 'route'> & { route: keyof TRouter & string };
  type TypedDropzoneProps = Omit<UploadDropzoneProps, 'route'> & { route: keyof TRouter & string };
  type TypedModalProps = Omit<UploadModalProps, 'route'> & { route: keyof TRouter & string };

  return {
    UploadButton: UploadButton as React.ComponentType<TypedButtonProps>,
    UploadDropzone: UploadDropzone as React.ComponentType<TypedDropzoneProps>,
    UploadModal: UploadModal as React.ComponentType<TypedModalProps>,
    useUploadKit: useUploadKit as (route: keyof TRouter & string) => ReturnType<typeof useUploadKit>,
  };
}
