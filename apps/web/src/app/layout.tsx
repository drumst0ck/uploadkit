import type { Metadata } from 'next';
import Script from 'next/script';
import { AnalyticsConsent } from '@uploadkitdev/ui';
import { satoshi, inter, geist, geistMono } from '@/lib/fonts';
import './globals.css';

const GOOGLE_TAG_MANAGER_ID = 'GTM-NDNZS4KX';
const GOOGLE_ANALYTICS_ID = 'G-F6MYZW8RZ5';

export const metadata: Metadata = {
  title: 'UploadKit — File Uploads for Developers',
  description:
    'Add beautiful, type-safe file uploads to your app in minutes. Free tier included.',
  metadataBase: new URL('https://uploadkit.dev'),
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.svg' },
};

// Pre-hydration script: restores theme + accent from localStorage BEFORE React paints.
// Runs synchronously in <head>; wrapped in try/catch so an SSR/CSP environment without
// localStorage cannot throw. Only whitelisted values are accepted; anything else is ignored.
const PREF_HYDRATION_SCRIPT = `(function(){try{var t=localStorage.getItem('uk-theme');var a=localStorage.getItem('uk-accent');var d=document.documentElement;if(t==='light'||t==='dark'){d.setAttribute('data-theme',t);}var ok=['violet','blue','green','orange','pink'];if(a&&ok.indexOf(a)!==-1){d.setAttribute('data-accent',a);}}catch(e){}})();`;

const GOOGLE_CONSENT_DEFAULT_SCRIPT = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});`;

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
          id="google-consent-default"
          dangerouslySetInnerHTML={{ __html: GOOGLE_CONSENT_DEFAULT_SCRIPT }}
        />
        <script
          // biome-ignore lint: trusted static string — prevents FOUC on theme/accent hydration
          dangerouslySetInnerHTML={{ __html: PREF_HYDRATION_SCRIPT }}
        />
      </head>
      <body className="antialiased">
        {children}
        <AnalyticsConsent>
          <Script id="google-tag-manager" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GOOGLE_TAG_MANAGER_ID}');`}
          </Script>
          <Script
            id="google-analytics"
            strategy="afterInteractive"
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
          />
          <Script
            id="google-analytics-config"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GOOGLE_ANALYTICS_ID}');`,
            }}
          />
        </AnalyticsConsent>
      </body>
    </html>
  );
}
