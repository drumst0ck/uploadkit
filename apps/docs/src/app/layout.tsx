import type { Metadata } from 'next';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { satoshi, inter } from '@/lib/fonts';
import './global.css';

// Search Console verification; emitted only when the env var is set.
const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  title: 'UploadKit Docs',
  description: 'UploadKit documentation — file upload as a service for developers.',
  icons: { icon: '/favicon.svg' },
  ...(googleSiteVerification
    ? { verification: { google: googleSiteVerification } }
    : {}),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${satoshi.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
