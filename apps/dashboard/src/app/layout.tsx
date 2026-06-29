import '@/lib/env';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { SWRProvider } from '../providers/swr-provider';
import { ThemeProvider } from '../providers/theme-provider';
import { TooltipProvider } from '@uploadkitdev/ui';

const GOOGLE_TAG_MANAGER_ID = 'GTM-NDNZS4KX';

export const metadata: Metadata = {
  title: 'UploadKit Dashboard',
  description: 'Manage file uploads, projects, and billing on UploadKit.',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GOOGLE_TAG_MANAGER_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
            title="Google Tag Manager"
          />
        </noscript>
        <ThemeProvider>
          <TooltipProvider>
            <SWRProvider>{children}</SWRProvider>
          </TooltipProvider>
        </ThemeProvider>
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GOOGLE_TAG_MANAGER_ID}');`}
        </Script>
      </body>
    </html>
  );
}
