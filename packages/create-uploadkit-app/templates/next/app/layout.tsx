import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import '@uploadkitdev/react/styles.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'UploadKit demo',
  description: 'A file-upload app powered by UploadKit.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
