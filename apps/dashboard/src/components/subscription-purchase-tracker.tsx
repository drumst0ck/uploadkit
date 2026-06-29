'use client';

import { useEffect } from 'react';

interface SubscriptionPurchaseTrackerProps {
  conversionId: string;
  currency: string;
  plan: string;
  value: number;
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function SubscriptionPurchaseTracker({
  conversionId,
  currency,
  plan,
  value,
}: SubscriptionPurchaseTrackerProps) {
  useEffect(() => {
    const storageKey = `uk_subscription_purchase_${conversionId}`;

    try {
      if (window.localStorage.getItem(storageKey)) return;

      window.dataLayer = window.dataLayer ?? [];
      window.dataLayer.push({
        event: 'subscription_purchase',
        conversion_id: conversionId,
        transaction_id: conversionId,
        currency,
        plan,
        value,
      });
      window.localStorage.setItem(storageKey, '1');
    } catch {
      // Tracking must never interfere with the confirmed billing experience.
    }
  }, [conversionId, currency, plan, value]);

  return null;
}
