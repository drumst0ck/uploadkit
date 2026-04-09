import type { ReactNode } from 'react';
import { NextSSRPlugin, extractRouterConfig } from '@uploadkit/next';
import '@uploadkit/react/styles.css';
import { uploadRouter } from './api/uploadkit/[...uploadkit]/core';

export const metadata = {
  title: 'UploadKit — Next.js Example',
  description: 'Example app demonstrating UploadKit with Next.js App Router',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: '#0a0a0b', color: '#fafafa', fontFamily: 'system-ui, sans-serif' }}>
        <NextSSRPlugin routerConfig={extractRouterConfig(uploadRouter)} />
        {children}
      </body>
    </html>
  );
}
