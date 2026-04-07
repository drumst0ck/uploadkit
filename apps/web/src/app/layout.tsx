import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UploadKit',
  description: 'File Uploads as a Service for developers',
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
