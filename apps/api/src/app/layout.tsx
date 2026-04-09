import '@/lib/env';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UploadKit API',
  description: 'UploadKit REST API',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
