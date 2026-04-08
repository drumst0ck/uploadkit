import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '../providers/theme-provider';
import { SWRProvider } from '../providers/swr-provider';

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
          <SWRProvider>{children}</SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
