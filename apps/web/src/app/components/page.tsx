import type { Metadata } from 'next';
import { ComponentShowcase } from '../test/components/component-showcase';

export const metadata: Metadata = {
  title: 'React Upload Components — UploadKit',
  description:
    'Browse 40+ premium, tree-shakeable React upload components with dark mode and CSS variable theming.',
  openGraph: {
    title: 'UploadKit React Components',
    description: 'Premium upload components for React — dropzones, buttons, galleries, croppers, and more.',
  },
};

export default function ComponentsGalleryPage() {
  return (
    <main className="components-gallery-page">
      <div className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
        <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <p className="section-label">@uploadkitdev/react</p>
          <h1 className="section-title">Component gallery</h1>
          <p className="section-subtitle">
            40+ upload components — copy with{' '}
            <code>pnpm dlx uploadkit add dropzone</code>
          </p>
        </header>
        <ComponentShowcase />
      </div>
    </main>
  );
}
