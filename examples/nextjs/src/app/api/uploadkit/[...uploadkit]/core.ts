import type { FileRouter } from '@uploadkitdev/next';

export const uploadRouter = {
  imageUploader: {
    maxFileSize: '4MB',
    maxFileCount: 4,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    middleware: async ({ req: _req }) => {
      // In a real app, authenticate the user here and return metadata
      return { uploadedBy: 'demo-user' };
    },
    onUploadComplete: async ({ file, metadata }) => {
      console.log('Image upload complete:', file.name, 'by', metadata.uploadedBy);
      return { url: file.url };
    },
  },
  documentUploader: {
    maxFileSize: '16MB',
    maxFileCount: 1,
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    middleware: async () => ({ uploadedBy: 'demo-user' }),
    onUploadComplete: async ({ file }) => {
      console.log('Document uploaded:', file.name);
    },
  },
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
