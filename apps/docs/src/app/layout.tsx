import type { Metadata } from 'next';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { geist, geistMono } from '@/lib/fonts'; // taste-skill-ignore: Geist Mono for code only
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

// taste-skill-ignore: the mono variable only feeds code, pre and kbd
const fontVariables = `dark ${geist.variable} ${geistMono.variable}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body className="antialiased">
        {/* Dark only: the identity is a black field. Forced so a stored light/system choice cannot flip it. */}
        <RootProvider theme={{ forcedTheme: 'dark', defaultTheme: 'dark', enableSystem: false }}>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
