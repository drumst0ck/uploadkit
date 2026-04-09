import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

function UploadKitLogo() {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {/* Upload arrow-in-box mark — matches favicon.svg shape */}
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="uk-nav-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366f1"/>
            <stop offset="100%" stopColor="#8b5cf6"/>
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="7" fill="url(#uk-nav-grad)"/>
        <path d="M16 22V12M16 12L12 16M16 12L20 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10 22h12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      <span style={{ fontWeight: 600, fontSize: '15px', letterSpacing: '-0.01em' }}>
        UploadKit
      </span>
    </span>
  );
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <UploadKitLogo />,
      url: 'https://uploadkit.dev',
    },
    githubUrl: 'https://github.com/uploadkit/uploadkit',
    links: [
      { text: 'Docs', url: '/docs', active: 'nested-url' },
      { text: 'uploadkit.dev', url: 'https://uploadkit.dev' },
    ],
  };
}
