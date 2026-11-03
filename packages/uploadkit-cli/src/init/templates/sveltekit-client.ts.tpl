// uploadkit:start — do not edit this block manually
import type { FileRouter } from '@uploadkitdev/next';

/**
 * Define your upload routes here. Each key becomes a slug at
 * /api/uploadkit/<slug>. See https://uploadkit.dev/docs for the full API.
 */
export const ukRouter = {
  // imageUploader: {
  //   maxFileSize: '4MB',
  //   allowedTypes: ['image/*'],
  //   onUploadComplete: async ({ file }) => {
  //     console.log('uploaded', file);
  //   },
  // },
} satisfies FileRouter;
// uploadkit:end
