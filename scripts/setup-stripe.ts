/**
 * Idempotent Stripe setup script.
 *
 * Creates Products, Prices, and Meters for UploadKit billing.
 * Safe to run multiple times — checks for existing resources before creating.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/setup-stripe.ts
 */

import Stripe from 'stripe';

// Hardcoded meter event names (not env vars — these are stable identifiers per RESEARCH.md)
const STRIPE_METER_STORAGE_EVENT = 'uploadkit_storage_bytes';
const STRIPE_METER_BANDWIDTH_EVENT = 'uploadkit_bandwidth_bytes';
const STRIPE_METER_UPLOADS_EVENT = 'uploadkit_upload_count';

const PRODUCTS = [
  {
    name: 'UploadKit Pro',
    key: 'pro',
    prices: [
      { amount: 1500, interval: 'month' as const, nickname: 'Pro Monthly' },
      { amount: 14400, interval: 'year' as const, nickname: 'Pro Yearly' },
    ],
  },
  {
    name: 'UploadKit Team',
    key: 'team',
    prices: [
      { amount: 3500, interval: 'month' as const, nickname: 'Team Monthly' },
      { amount: 33600, interval: 'year' as const, nickname: 'Team Yearly' },
    ],
  },
];

const METERS = [
  {
    displayName: 'Storage Bytes',
    eventName: STRIPE_METER_STORAGE_EVENT,
    aggregation: 'sum' as const,
  },
  {
    displayName: 'Bandwidth Bytes',
    eventName: STRIPE_METER_BANDWIDTH_EVENT,
    aggregation: 'sum' as const,
  },
  {
    displayName: 'Upload Count',
    eventName: STRIPE_METER_UPLOADS_EVENT,
    aggregation: 'sum' as const,
  },
];

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error('Error: STRIPE_SECRET_KEY environment variable is not set.');
    process.exit(1);
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2026-03-25.dahlia',
  });

  console.log('Setting up Stripe products, prices, and meters...\n');

  // ── Products & Prices ─────────────────────────────────────────────────────

  const createdPrices: Record<string, string> = {};

  for (const product of PRODUCTS) {
    // Check if product already exists
    const existingProducts = await stripe.products.list({ limit: 100 });
    let existingProduct = existingProducts.data.find(
      (p) => p.name === product.name && p.active,
    );

    if (existingProduct) {
      console.log(`Product "${product.name}" already exists: ${existingProduct.id}`);
    } else {
      existingProduct = await stripe.products.create({
        name: product.name,
        metadata: { uploadkit_plan: product.key },
      });
      console.log(`Created product "${product.name}": ${existingProduct.id}`);
    }

    for (const price of product.prices) {
      // Check if price already exists for this product
      const existingPrices = await stripe.prices.list({
        product: existingProduct.id,
        active: true,
        limit: 100,
      });

      const existingPrice = existingPrices.data.find(
        (p) =>
          p.unit_amount === price.amount &&
          p.recurring?.interval === price.interval,
      );

      if (existingPrice) {
        console.log(
          `  Price "${price.nickname}" already exists: ${existingPrice.id}`,
        );
        createdPrices[`${product.key}_${price.interval}`] = existingPrice.id;
      } else {
        const newPrice = await stripe.prices.create({
          product: existingProduct.id,
          unit_amount: price.amount,
          currency: 'usd',
          recurring: { interval: price.interval },
          nickname: price.nickname,
        });
        console.log(`  Created price "${price.nickname}": ${newPrice.id}`);
        createdPrices[`${product.key}_${price.interval}`] = newPrice.id;
      }
    }
  }

  // ── Meters ────────────────────────────────────────────────────────────────

  const existingMeters = await stripe.billing.meters.list({ limit: 100 });
  const createdMeters: Record<string, string> = {};

  for (const meter of METERS) {
    const existing = existingMeters.data.find(
      (m) => m.event_name === meter.eventName,
    );

    if (existing) {
      console.log(`Meter "${meter.displayName}" already exists: ${existing.id}`);
      createdMeters[meter.eventName] = existing.id;
    } else {
      const newMeter = await stripe.billing.meters.create({
        display_name: meter.displayName,
        event_name: meter.eventName,
        default_aggregation: { formula: meter.aggregation },
      });
      console.log(`Created meter "${meter.displayName}": ${newMeter.id}`);
      createdMeters[meter.eventName] = newMeter.id;
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log('\n──────────────────────────────────────────────');
  console.log('Setup complete. Add these to your .env file:\n');
  console.log(`STRIPE_PRO_PRICE_ID=${createdPrices['pro_month']}`);
  console.log(`STRIPE_TEAM_PRICE_ID=${createdPrices['team_month']}`);
  console.log('\nMeter IDs (for reference — event names are used in code):');
  console.log(`  ${STRIPE_METER_STORAGE_EVENT}: ${createdMeters[STRIPE_METER_STORAGE_EVENT]}`);
  console.log(`  ${STRIPE_METER_BANDWIDTH_EVENT}: ${createdMeters[STRIPE_METER_BANDWIDTH_EVENT]}`);
  console.log(`  ${STRIPE_METER_UPLOADS_EVENT}: ${createdMeters[STRIPE_METER_UPLOADS_EVENT]}`);
  console.log('──────────────────────────────────────────────');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
