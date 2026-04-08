import type { Metadata } from 'next';
import { satoshi, inter } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'UploadKit — File Uploads for Developers',
  description: 'Add beautiful, type-safe file uploads to your app in minutes. Free tier included.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" className={`${satoshi.variable} ${inter.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
