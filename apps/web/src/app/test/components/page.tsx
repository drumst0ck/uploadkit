import type { Metadata } from 'next';
import { ComponentShowcase } from './component-showcase';

export const metadata: Metadata = {
  title: 'SDK Components Test — UploadKit',
  description: 'Internal visual showcase of all @uploadkitdev/react components.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function TestComponentsPage() {
  return <ComponentShowcase />;
}
