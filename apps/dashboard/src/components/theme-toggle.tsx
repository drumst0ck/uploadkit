'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';

/** Text button, `aria-pressed` when the light theme is on. Pill ghost control from the pd kit. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isLight = mounted && resolvedTheme === 'light';

  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? 'dark' : 'light')}
      aria-pressed={isLight}
      className={`pd-button pd-button--ghost justify-start ${className ?? ''}`}
      style={{ minHeight: '2.5rem', justifyContent: 'flex-start', padding: '0 0.75rem' }}
    >
      {isLight ? 'Dark theme' : 'Light theme'}
    </button>
  );
}
