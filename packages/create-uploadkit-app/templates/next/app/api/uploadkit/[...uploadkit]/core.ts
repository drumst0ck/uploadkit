import type { FileRouter } from '@uploadkitdev/next';

/**
 * Define one route per "kind" of upload in your app. The slug (key) becomes
 * the `route` prop you pass to the client components.
 *
 * See https://docs.uploadkit.dev/core-concepts/file-routes for all options.
 */
export const uploadRouter = {
  imageUploader: {
    maxFileSize: '4MB',
    maxFileCount: 4,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    middleware: async () => {
      // Authenticate the user and return any metadata you want on the uploaded file.
      return { uploadedBy: 'demo-user' };
    },
    onUploadComplete: async ({ file, metadata }) => {
      console.log('Upload complete:', file.name, 'by', metadata.uploadedBy);
      return { url: file.url };
    },
  },
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
