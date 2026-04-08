import defaultMdxComponents from 'fumadocs-ui/mdx';
import * as TabsComponents from 'fumadocs-ui/components/tabs';
import type { MDXComponents } from 'mdx/types';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  // Cast to MDXComponents to satisfy exactOptionalPropertyTypes — fumadocs-ui/mdx
  // types use slightly narrower optional signatures than mdx/types expects.
  return {
    ...(defaultMdxComponents as MDXComponents),
    ...(TabsComponents as MDXComponents),
    ...components,
  };
}

export function useMDXComponents(components?: MDXComponents): MDXComponents {
  return getMDXComponents(components);
}
