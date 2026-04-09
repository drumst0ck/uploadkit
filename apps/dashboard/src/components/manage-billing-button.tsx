'use client';

import * as React from 'react';
import { Button } from '@uploadkit/ui';
import { createPortalSession } from '../app/dashboard/billing/actions';

export function ManageBillingButton() {
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const { url } = await createPortalSession();
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // no-op
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={() => void handleClick()}
      disabled={loading}
    >
      {loading ? 'Opening…' : 'Manage Billing'}
    </Button>
  );
}
