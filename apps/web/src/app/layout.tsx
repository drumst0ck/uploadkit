import type { Metadata } from 'next';
import { satoshi, inter, geist, geistMono } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'UploadKit — File Uploads for Developers',
  description: 'Add beautiful, type-safe file uploads to your app in minutes. Free tier included.',
  metadataBase: new URL('https://uploadkit.dev'),
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.svg' },
};

// Pre-hydration script: restores theme + accent from localStorage BEFORE React paints.
// Runs synchronously in <head>; wrapped in try/catch so an SSR/CSP environment without
// localStorage cannot throw. Only whitelisted values are accepted; anything else is ignored.
const PREF_HYDRATION_SCRIPT = `(function(){try{var t=localStorage.getItem('uk-theme');var a=localStorage.getItem('uk-accent');var d=document.documentElement;if(t==='light'||t==='dark'){d.setAttribute('data-theme',t);}var ok=['violet','blue','green','orange','pink'];if(a&&ok.indexOf(a)!==-1){d.setAttribute('data-accent',a);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="dark"
      data-accent="violet"
      className={`${satoshi.variable} ${inter.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <head>
        <script
          // biome-ignore lint: trusted static string — prevents FOUC on theme/accent hydration
          dangerouslySetInnerHTML={{ __html: PREF_HYDRATION_SCRIPT }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
