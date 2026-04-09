import '@/lib/env';
import type { Metadata } from 'next';
import './globals.css';
import { SWRProvider } from '../providers/swr-provider';
import { ThemeProvider } from '../providers/theme-provider';
import { TooltipProvider } from '@uploadkitdev/ui';

export const metadata: Metadata = {
  title: 'UploadKit Dashboard',
  description: 'Manage file uploads, projects, and billing on UploadKit.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider>
          <TooltipProvider>
            <SWRProvider>{children}</SWRProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
