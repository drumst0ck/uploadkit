// uploadkit:start — do not edit this block manually
// NB: we use a relative import (../../../../lib/uploadkit) instead of the
// `@/` alias because create-next-app projects are opt-in on the alias and
// bare-bones next projects without `tsconfig.paths["@/*"]` would fail to
// compile this file after `uploadkit init`. The relative climb is derived
// from the fixed route path `app/api/uploadkit/[...uploadkit]/route.ts` →
// `lib/uploadkit.ts` at the project root.
import { createUploadKitHandler } from '@uploadkitdev/next';
import { ukRouter } from '../../../../lib/uploadkit';

export const { GET, POST } = createUploadKitHandler({ router: ukRouter });
// uploadkit:end
