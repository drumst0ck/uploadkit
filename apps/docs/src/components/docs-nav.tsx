'use client';

import { createContext, use, type ReactNode } from 'react';
import type * as PageTree from 'fumadocs-core/page-tree';
import { usePathname } from 'fumadocs-core/framework';
import {
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
} from 'fumadocs-ui/components/sidebar/base';
import { useTreePath } from 'fumadocs-ui/contexts/tree';

// Sidebar page-tree renderers (DocsLayout `sidebar.components`).
// Top level folders become headings with a plain list of rows; deeper
// folders (the SDK packages) stay collapsible and open on the current page.

const DepthContext = createContext(0);

function isCurrent(url: string, pathname: string) {
  const clean = (v: string) => (v.length > 1 ? v.replace(/\/$/, '') : v);
  return clean(url) === clean(pathname);
}

export function NavItem({ item }: { item: PageTree.Item }) {
  const depth = use(DepthContext);
  const pathname = usePathname();
  const active = isCurrent(item.url, pathname);
  const row = (
    <SidebarItem
      href={item.url}
      {...(item.external ? { external: true } : {})}
      active={active}
      aria-current={active ? 'page' : undefined}
      className="uk-nav-link"
    >
      {item.name}
    </SidebarItem>
  );
  return depth === 0 ? <div className="uk-nav-root">{row}</div> : <li>{row}</li>;
}

export function NavSeparator({ item }: { item: PageTree.Separator }) {
  // Top level separators repeat the folder title that follows; skip them.
  if (use(DepthContext) <= 1) return null;
  return (
    <li role="presentation" className="uk-nav-sub">
      {item.name}
    </li>
  );
}

function Rows({ children }: { children: ReactNode }) {
  return <ul className="uk-nav-list">{children}</ul>;
}

export function NavFolder({ item, children }: { item: PageTree.Folder; children: ReactNode }) {
  const depth = use(DepthContext);
  const pathname = usePathname();
  const path = useTreePath();
  const next = <DepthContext value={depth + 1}>{children}</DepthContext>;

  if (depth === 0) {
    const label = `uk-nav-${String(item.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    return (
      <section className="uk-nav-group" aria-labelledby={label}>
        <h2 id={label} className="uk-nav-h">
          {item.name}
        </h2>
        <Rows>{next}</Rows>
      </section>
    );
  }

  // A folder that is only an index page reads as a plain row.
  if (item.index && item.children.length === 0) {
    const active = isCurrent(item.index.url, pathname);
    return (
      <li>
        <SidebarItem
          href={item.index.url}
          active={active}
          aria-current={active ? 'page' : undefined}
          className="uk-nav-link"
        >
          {item.name}
        </SidebarItem>
      </li>
    );
  }

  const active = path.includes(item);
  return (
    <li>
      <SidebarFolder
        active={active}
        {...(item.collapsible !== undefined ? { collapsible: item.collapsible } : {})}
        {...(item.defaultOpen !== undefined ? { defaultOpen: item.defaultOpen } : {})}
      >
        {item.index ? (
          <SidebarFolderLink
            href={item.index.url}
            active={isCurrent(item.index.url, pathname)}
            aria-current={isCurrent(item.index.url, pathname) ? 'page' : undefined}
            className="uk-nav-link uk-nav-folder"
          >
            {item.name}
          </SidebarFolderLink>
        ) : (
          <SidebarFolderTrigger className="uk-nav-link uk-nav-folder">{item.name}</SidebarFolderTrigger>
        )}
        <SidebarFolderContent>
          <Rows>{next}</Rows>
        </SidebarFolderContent>
      </SidebarFolder>
    </li>
  );
}

export function SidebarLinks() {
  return (
    <div className="uk-ext">
      <a href="https://uploadkit.dev">uploadkit.dev</a>
      <a href="https://app.uploadkit.dev">Dashboard</a>
      <a href="https://github.com/drumst0ck/uploadkit">GitHub</a>
    </div>
  );
}
