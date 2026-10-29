import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

function UploadKitLogo() {
  return (
    <span className="uk-logo">
      {/* Monochrome mark, same shape as favicon.svg */}
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <rect width="32" height="32" rx="8" fill="#fff" />
        <polygon points="16,7 23,17 9,17" fill="#000" />
        <rect x="9" y="19" width="14" height="4" rx="1.5" fill="#000" fillOpacity=".55" />
      </svg>
      <span>UploadKit</span>
      <span className="uk-logo__soft">Docs</span>
    </span>
  );
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <UploadKitLogo />,
      url: '/docs',
    },
    themeSwitch: { enabled: false },
  };
}
