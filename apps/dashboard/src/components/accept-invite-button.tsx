'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  async function accept() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/internal/team/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not accept the invitation.');
        return;
      }
      router.push('/dashboard');
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => { void accept(); }}
        disabled={loading}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
      >
        Accept invitation
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
