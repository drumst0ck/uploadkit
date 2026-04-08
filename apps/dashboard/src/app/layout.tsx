import type { Metadata } from 'next';
import './globals.css';

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
      {/* Dark surface + antialiasing applied globally so every route inherits it */}
      <body className="bg-[#0a0a0b] text-zinc-50 antialiased">{children}</body>
    </html>
  );
}
