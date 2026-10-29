'use client';

import * as React from 'react';

/** Ghost pill that copies a file URL; the label changes to "Copied" for feedback. */
export function CopyUrlButton({ url, name }: { url: string; name: string }) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      className="pd-button pd-button--ghost"
      style={{ minHeight: '2rem', padding: '0 var(--pd-space-4)' }}
      onClick={copy}
      aria-label={`Copy URL for ${name}`}
    >
      {copied ? 'Copied' : 'Copy URL'}
    </button>
  );
}
