import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { source } from '@/lib/source';
import { baseOptions } from '@/lib/layout.shared';
import { NavFolder, NavItem, NavSeparator, SidebarLinks } from '@/components/docs-nav';
import '@uploadkitdev/react/styles.css';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="uk-skip" href="#nd-page">
        Skip to content
      </a>
      <DocsLayout
        tree={source.pageTree}
        sidebar={{
          defaultOpenLevel: 0,
          collapsible: false,
          components: { Item: NavItem, Folder: NavFolder, Separator: NavSeparator },
          // keyed: a server-made element inside fumadocs' children array otherwise trips React's key warning in dev
          footer: [<SidebarLinks key="ext" />],
        }}
        // The grid itself lives in global.css (--uk-grid) so it can change per breakpoint.
        containerProps={{ className: 'uk-shell', style: { gridTemplate: 'var(--uk-grid)' } }}
        {...baseOptions()}
      >
        {children}
      </DocsLayout>
    </>
  );
}
