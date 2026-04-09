import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '../providers/theme-provider';
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
    // suppressHydrationWarning required by next-themes to avoid class mismatch
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[#0a0a0b] text-zinc-50 antialiased">
        <ThemeProvider>
          <TooltipProvider>
            <SWRProvider>{children}</SWRProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
