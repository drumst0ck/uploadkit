import { defineDocs, defineConfig } from 'fumadocs-mdx/config';

// @ts-ignore — zod v4 type portability issue: inferred type references internal zod module path
export const docs = defineDocs({ dir: 'content/docs' });

// Monochrome syntax theme (personal-design: pure greys, no hue). Comments and
// strings step down in grey, keywords step up to white; identifiers keep the
// text colour. The same theme serves both fumadocs variants.
const monochrome = {
  name: 'uploadkit-monochrome',
  type: 'dark' as const,
  colors: { 'editor.background': '#0a0a0a', 'editor.foreground': '#ededed' },
  settings: [
    { settings: { foreground: '#ededed' } },
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#8f8f8f' } },
    { scope: ['string', 'string.quoted', 'punctuation.definition.string'], settings: { foreground: '#a1a1a1' } },
    {
      scope: ['keyword', 'storage', 'storage.type', 'keyword.control', 'keyword.operator.new', 'constant.language', 'entity.name.tag'],
      settings: { foreground: '#ffffff', fontStyle: 'bold' },
    },
    { scope: ['punctuation', 'meta.brace'], settings: { foreground: '#a1a1a1' } },
  ],
};

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: { light: monochrome, dark: monochrome },
    },
  },
});
