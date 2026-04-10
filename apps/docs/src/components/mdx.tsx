import defaultMdxComponents from 'fumadocs-ui/mdx';
import * as TabsComponents from 'fumadocs-ui/components/tabs';
import type { MDXComponents } from 'mdx/types';
import { ComponentPreview } from './component-preview';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  // Cast to MDXComponents to satisfy exactOptionalPropertyTypes — fumadocs-ui/mdx
  // types use slightly narrower optional signatures than mdx/types expects.
  return {
    ...(defaultMdxComponents as MDXComponents),
    ...(TabsComponents as MDXComponents),
    ComponentPreview: ComponentPreview as MDXComponents[string],
    ...components,
  };
}

export function useMDXComponents(components?: MDXComponents): MDXComponents {
  return getMDXComponents(components);
}
