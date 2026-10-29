import type { Metadata } from 'next';
import { SiteShell } from '@/components/site/shell';
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
  return (
    <SiteShell>
      <div className="sec" style={{ marginTop: 64 }}>
        <ComponentShowcase />
      </div>
    </SiteShell>
  );
}
