import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UploadKit Docs',
  description: 'UploadKit documentation',
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
