import type { Metadata } from 'next';
import './globals.css';
import { SWRProvider } from '../providers/swr-provider';
import { TooltipProvider } from '@uploadkit/ui';

export const metadata: Metadata = {
  title: 'UploadKit Dashboard',
  description: 'Manage file uploads, projects, and billing on UploadKit.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a0b] text-zinc-50 antialiased">
        <TooltipProvider>
          <SWRProvider>{children}</SWRProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
