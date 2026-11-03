import { generateReactHelpers } from '@uploadkitdev/next';
import type { FileRouter } from '@uploadkitdev/next';
const router = { media: { maxFileSize: '4MB' } } satisfies FileRouter;
const { UploadButton, UploadDropzone, UploadModal, useUploadKit } = generateReactHelpers<typeof router>();
const button = <UploadButton route="media" onUploadComplete={file => { const key: string = file.key; void key; }} />;
const dropzone = <UploadDropzone route="media" />;
const modal = <UploadModal route="media" open={false} onClose={() => {}} />;
// @ts-expect-error Only router keys are valid.
const invalid = <UploadButton route="unknown" />;
// @ts-expect-error Only router keys are valid.
useUploadKit('unknown');
void [button, dropzone, modal, invalid];
