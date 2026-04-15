// uploadkit:start — do not edit this block manually
import { createUploadKitHandler } from '@uploadkitdev/next';
import { ukRouter } from '@/lib/uploadkit';

export const { GET, POST } = createUploadKitHandler({ router: ukRouter });
// uploadkit:end
