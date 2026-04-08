import { defineDocs, defineConfig } from 'fumadocs-mdx/config';

// @ts-ignore — zod v4 type portability issue: inferred type references internal zod module path
export const docs = defineDocs({ dir: 'content/docs' });

export default defineConfig();
