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

export function ComponentShowcase({ header = true }: { header?: boolean } = {}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <UploadKitProvider endpoint={FAKE_ENDPOINT}>
      <div className="showcase sdk-stage" data-ui>
        {header && (
        <header className="showcase-header">
          <h2 className="showcase-title">SDK Components</h2>
          <p className="showcase-sub">
            Visual showcase of every component in{' '}
            <code>@uploadkitdev/react</code>. Endpoint is a no-op —
            clicking upload will fail silently. All animations use{' '}
            <code>motion</code> (optional peerDep) with CSS fallbacks.
          </p>
        </header>
        )}

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
      </div>
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
