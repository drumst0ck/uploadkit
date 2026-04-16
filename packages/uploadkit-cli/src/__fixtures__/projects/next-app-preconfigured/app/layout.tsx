import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { UploadKitProvider } from '@uploadkitdev/react';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Preconfigured App',
  description: 'Simulates a create-uploadkit-app project (no markers).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <UploadKitProvider>
          {children}
        </UploadKitProvider>
      </body>
    </html>
  );
}
