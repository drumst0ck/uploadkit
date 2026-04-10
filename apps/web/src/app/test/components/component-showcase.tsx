'use client';

import {
  UploadKitProvider,
  UploadButton,
  UploadDropzone,
  UploadModal,
  UploadDropzoneGlass,
  UploadDropzoneAurora,
  UploadDropzoneTerminal,
  UploadDropzoneBrutal,
  UploadButtonShimmer,
  UploadButtonMagnetic,
  UploadAvatar,
  UploadInlineChat,
  UploadProgressRadial,
  UploadProgressBar,
  UploadProgressStacked,
  UploadProgressOrbit,
  UploadCloudRain,
  UploadBento,
  UploadParticles,
  UploadStepWizard,
} from '@uploadkitdev/react';
import '@uploadkitdev/react/styles.css';
import { useState, type ReactNode } from 'react';

// Non-existent endpoint — showcase is visual only, uploads never resolve.
const FAKE_ENDPOINT = '/api/uploadkit-noop';
const FAKE_ROUTE = 'showcase';

export function ComponentShowcase() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <UploadKitProvider endpoint={FAKE_ENDPOINT}>
      <main className="showcase">
        <header className="showcase-header">
          <p className="showcase-kicker">Internal · not indexed</p>
          <h1 className="showcase-title">SDK Components</h1>
          <p className="showcase-sub">
            Visual showcase of every component in{' '}
            <code>@uploadkitdev/react</code>. Endpoint is a no-op —
            clicking upload will fail silently. All animations use{' '}
            <code>motion</code> (optional peerDep) with CSS fallbacks.
          </p>
        </header>

        <Section
          title="Classics"
          description="The original 5 components shipped with v0.1."
        >
          <Card name="UploadButton" inspiration="Baseline">
            <UploadButton route={FAKE_ROUTE} />
          </Card>
          <Card name="UploadDropzone" inspiration="Baseline">
            <UploadDropzone route={FAKE_ROUTE} />
          </Card>
          <Card name="UploadModal" inspiration="Native <dialog>">
            <button
              type="button"
              className="showcase-fake-btn"
              onClick={() => setModalOpen(true)}
            >
              Open modal
            </button>
            <UploadModal
              route={FAKE_ROUTE}
              open={modalOpen}
              onClose={() => setModalOpen(false)}
            />
          </Card>
        </Section>

        <Section
          title="Premium dropzones"
          description="Four opinionated aesthetics. Pick the one that matches your app's soul."
        >
          <Card
            name="UploadDropzoneGlass"
            inspiration="Vercel · Linear — frosted glass + indigo halo"
          >
            <UploadDropzoneGlass route={FAKE_ROUTE} />
          </Card>
          <Card
            name="UploadDropzoneAurora"
            inspiration="Apple · Supabase — animated conic mesh + cursor highlight"
          >
            <UploadDropzoneAurora route={FAKE_ROUTE} />
          </Card>
          <Card
            name="UploadDropzoneTerminal"
            inspiration="Raycast · Warp — mono prompt + blinking cursor"
          >
            <UploadDropzoneTerminal route={FAKE_ROUTE} />
          </Card>
          <Card
            name="UploadDropzoneBrutal"
            inspiration="Neobrutalist — thick borders, hard shadows, stamp"
          >
            <UploadDropzoneBrutal route={FAKE_ROUTE} />
          </Card>
        </Section>

        <Section
          title="Premium buttons"
          description="Drop-in replacements for UploadButton with premium motion."
        >
          <Card
            name="UploadButtonShimmer"
            inspiration="Vercel · Linear — animated shimmer sweep + glow"
          >
            <UploadButtonShimmer route={FAKE_ROUTE} />
          </Card>
          <Card
            name="UploadButtonMagnetic"
            inspiration="Apple — cursor-attracted spring scale"
          >
            <UploadButtonMagnetic route={FAKE_ROUTE} />
          </Card>
        </Section>

        <Section
          title="Specialty"
          description="Purpose-built for common flows outside the generic picker pattern."
        >
          <Card
            name="UploadAvatar"
            inspiration="Circular crop + SVG progress ring"
          >
            <UploadAvatar route={FAKE_ROUTE} size={112} />
          </Card>
          <Card
            name="UploadInlineChat"
            inspiration="ChatGPT · Linear — inline composer with animated chips"
          >
            <UploadInlineChat
              route={FAKE_ROUTE}
              placeholder="Message UploadKit…"
            />
          </Card>
        </Section>

        <Section
          title="Motion & Progress"
          description="Eight motion-forward upload affordances. All animations via motion (optional peerDep) with CSS fallbacks."
        >
          <Card
            name="UploadProgressRadial"
            inspiration="Linear attachments · Apple Health activity ring"
          >
            <UploadProgressRadial route={FAKE_ROUTE} />
          </Card>
          <Card
            name="UploadProgressBar"
            inspiration="Vercel build logs · Linear CI bars"
          >
            <UploadProgressBar route={FAKE_ROUTE} />
          </Card>
          <Card
            name="UploadProgressStacked"
            inspiration="iOS AirDrop · Telegram multi-send"
          >
            <UploadProgressStacked route={FAKE_ROUTE} />
          </Card>
          <Card
            name="UploadProgressOrbit"
            inspiration="Arc browser · Raycast command palette"
          >
            <UploadProgressOrbit route={FAKE_ROUTE} />
          </Card>
          <Card
            name="UploadCloudRain"
            inspiration="iCloud sync · Dropbox onboarding"
          >
            <UploadCloudRain route={FAKE_ROUTE} />
          </Card>
          <Card
            name="UploadBento"
            inspiration="Apple iPadOS widgets · Raycast themes grid"
          >
            <UploadBento route={FAKE_ROUTE} />
          </Card>
          <Card
            name="UploadParticles"
            inspiration="Stripe 3DS loading · Vercel Ship hero"
          >
            <UploadParticles route={FAKE_ROUTE} />
          </Card>
          <Card
            name="UploadStepWizard"
            inspiration="Stripe Checkout · Apple Pay add card"
          >
            <UploadStepWizard route={FAKE_ROUTE} />
          </Card>
        </Section>
      </main>

      <style>{`
        .showcase {
          min-height: 100vh;
          padding: 4rem 1.5rem 6rem;
          background: radial-gradient(
              1200px 600px at 50% -10%,
              rgba(99, 102, 241, 0.08),
              transparent 60%
            ),
            #0a0a0b;
          color: #fafafa;
          font-family: var(--font-inter), system-ui, sans-serif;
        }
        .showcase-header {
          max-width: 1200px;
          margin: 0 auto 4rem;
          text-align: center;
        }
        .showcase-kicker {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.24);
          color: #fca5a5;
          font-size: 0.75rem;
          font-weight: 500;
          letter-spacing: 0.02em;
          margin-bottom: 1.5rem;
        }
        .showcase-title {
          font-family: var(--font-satoshi), system-ui, sans-serif;
          font-size: clamp(2.5rem, 6vw, 4.5rem);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1;
          margin: 0 0 1.25rem;
          background: linear-gradient(180deg, #fafafa 0%, #a1a1aa 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .showcase-sub {
          max-width: 640px;
          margin: 0 auto;
          color: #a1a1aa;
          font-size: 1rem;
          line-height: 1.7;
        }
        .showcase-sub code {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.875em;
          background: rgba(255, 255, 255, 0.06);
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .showcase-section {
          max-width: 1200px;
          margin: 0 auto 5rem;
        }
        .showcase-section-header {
          margin-bottom: 2rem;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .showcase-section-title {
          font-family: var(--font-satoshi), system-ui, sans-serif;
          font-size: 1.5rem;
          font-weight: 600;
          letter-spacing: -0.02em;
          margin: 0 0 0.5rem;
          color: #fafafa;
        }
        .showcase-section-desc {
          margin: 0;
          color: #71717a;
          font-size: 0.9375rem;
          line-height: 1.6;
        }
        .showcase-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }
        .showcase-card {
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.02) 0%,
            rgba(255, 255, 255, 0) 100%
          );
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          min-height: 280px;
          transition: border-color 200ms ease, transform 200ms ease;
        }
        .showcase-card:hover {
          border-color: rgba(255, 255, 255, 0.12);
          transform: translateY(-2px);
        }
        .showcase-card-label {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .showcase-card-name {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #e4e4e7;
          letter-spacing: -0.01em;
        }
        .showcase-card-inspiration {
          font-size: 0.6875rem;
          color: #71717a;
          letter-spacing: 0.01em;
          text-transform: uppercase;
        }
        .showcase-card-stage {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.03);
        }
        .showcase-fake-btn {
          padding: 0.625rem 1.25rem;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          color: #fafafa;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 150ms ease;
        }
        .showcase-fake-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </UploadKitProvider>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="showcase-section">
      <div className="showcase-section-header">
        <h2 className="showcase-section-title">{title}</h2>
        <p className="showcase-section-desc">{description}</p>
      </div>
      <div className="showcase-grid">{children}</div>
    </section>
  );
}

function Card({
  name,
  inspiration,
  children,
}: {
  name: string;
  inspiration: string;
  children: ReactNode;
}) {
  return (
    <div className="showcase-card">
      <div className="showcase-card-label">
        <span className="showcase-card-name">{name}</span>
        <span className="showcase-card-inspiration">{inspiration}</span>
      </div>
      <div className="showcase-card-stage">{children}</div>
    </div>
  );
}
