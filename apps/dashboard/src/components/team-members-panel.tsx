'use client';

import * as React from 'react';
import type { Tier } from '@uploadkitdev/shared';
import { getTeamMemberLimit } from '@uploadkitdev/shared';
import { TierGate } from './tier-gate';

interface TeamMember {
  _id: string;
  email: string;
  role: 'admin' | 'member';
  status: 'pending' | 'active';
  invitedAt: string;
}

interface TeamMembersPanelProps {
  tier: Tier;
  initialMembers: TeamMember[];
}

export function TeamMembersPanel({ tier, initialMembers }: TeamMembersPanelProps) {
  const [members, setMembers] = React.useState(initialMembers);
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<'admin' | 'member'>('member');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const limit = getTeamMemberLimit(tier);
  const atLimit = members.length >= limit;

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/internal/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = (await res.json()) as { error?: string; member?: TeamMember };
      if (!res.ok) {
        setError(data.error ?? 'Failed to send invite.');
        return;
      }
      if (data.member) setMembers((prev) => [...prev, data.member!]);
      setEmail('');
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  async function removeMember(id: string) {
    const res = await fetch(`/api/internal/team/${id}`, { method: 'DELETE' });
    if (res.ok) setMembers((prev) => prev.filter((m) => m._id !== id));
  }

  return (
    <TierGate tier={tier} feature="teamCollaboration" featureLabel="Team collaboration">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-foreground">Team members</h2>
            <p className="text-xs text-muted-foreground">
              {members.length} / {limit === Infinity ? '∞' : limit} seats used
            </p>
          </div>
        </div>

        <ul className="mb-6 divide-y divide-border rounded-lg border border-border">
          {members.map((member) => (
            <li key={member._id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="text-foreground">{member.email}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {member.role} · {member.status}
                </p>
              </div>
              {member._id !== 'owner' && (member.status !== 'active' || members.length > 1) ? (
                <button
                  type="button"
                  onClick={() => { void removeMember(member._id); }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        <form onSubmit={(e) => { void invite(e); }} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@company.com"
            required
            disabled={atLimit}
            className="flex-1 rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
            className="rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={loading || atLimit}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            Invite
          </button>
        </form>

        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
    </TierGate>
  );
}
