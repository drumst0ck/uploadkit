'use client';

import { useEffect } from 'react';
import { parsePlanIntent } from '../lib/plan-intent';

interface SignUpTrackerProps {
  method: 'github' | 'google' | 'email' | null;
}

// Rendered by the dashboard layout only once per new account (server-side
// claim, see lib/sign-up-tracking.ts). plan_intent comes from the `plan`
// query param when the first landing is /dashboard/billing?plan=…
export function SignUpTracker({ method }: SignUpTrackerProps) {
  useEffect(() => {
    try {
      const plan = parsePlanIntent(new URLSearchParams(window.location.search).get('plan'));
      window.dataLayer = window.dataLayer ?? [];
      window.dataLayer.push({
        event: 'sign_up',
        ...(method ? { method } : {}),
        ...(plan ? { plan_intent: plan } : {}),
      });
    } catch {
      // Tracking must never interfere with the dashboard.
    }
  }, [method]);

  return null;
}
