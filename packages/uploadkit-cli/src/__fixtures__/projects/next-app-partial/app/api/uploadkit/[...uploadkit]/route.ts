import { createUploadKitHandler } from '@uploadkitdev/next';
import { ukRouter } from './core';

export const { GET, POST } = createUploadKitHandler({ router: ukRouter });
