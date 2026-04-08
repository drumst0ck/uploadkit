import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: 'UploadKit', url: '/' },
    githubUrl: 'https://github.com/uploadkit/uploadkit',
    links: [{ text: 'Docs', url: '/docs', active: 'nested-url' }],
  };
}
