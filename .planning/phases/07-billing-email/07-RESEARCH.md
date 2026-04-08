# Phase 7: Billing & Email - Research

**Researched:** 2026-04-08
**Domain:** Stripe subscriptions (Checkout, Billing Portal, Meters API), metered overage billing, transactional email (Resend + React Email)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Stripe Checkout (hosted page) for upgrade/subscription creation. No embedded Elements.
- **D-02:** Stripe webhook handler at `POST /api/v1/webhooks/stripe` in the API app.
- **D-03:** Real-time per-event MeterEvent reporting. Each upload/bandwidth event fires immediately.
- **D-04:** Soft limit with alerts — uploads continue past 100%. Email alerts at 80% and 100%. Overage billed on next invoice. No hard blocking.
- **D-05:** React Email templates (`@react-email/components`). Render to HTML via Resend SDK at send time.
- **D-06:** Full marketing email design — rich layout with UploadKit branding.
- **D-07:** Tier limits checked in `/api/v1/upload/request` before presigned URL. Reject with Stripe-style error + upgrade CTA URL.
- **D-08:** Usage alert emails fire on the upload that crosses 80%/100% threshold. Check after `$inc` in complete handler. Real-time, no cron.

### Claude's Discretion

- Stripe Products/Prices setup approach (API vs Dashboard)
- Webhook event handler structure (switch vs handler map)
- Stripe Meters API configuration specifics (meter names, event names)
- React Email template component structure
- Billing Portal configuration (allowed features)
- Invoice webhook handling (invoice.paid, invoice.payment_failed)
- Subscription status sync timing

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BILL-01 | Stripe Checkout for Pro/Team subscription creation | D-01 locked; Checkout Session API confirmed in Stripe SDK v22 |
| BILL-02 | Stripe Billing Portal for plan management | `stripe.billingPortal.sessions.create()` confirmed; requires pre-configuration in Stripe Dashboard |
| BILL-03 | Stripe webhook handling (checkout.session.completed, subscription.updated/deleted, invoice.paid/failed) | Webhook handler pattern derived from QStash DLQ existing route; signature verification critical |
| BILL-04 | Metered overage billing via Stripe Meters API | Meters API (not legacy UsageRecord) — confirmed in STACK.md and PITFALLS.md; SDK v22 exposes `stripe.billing.meters` and `stripe.billing.meterEvents` |
| BILL-05 | Usage tracking with MongoDB atomic $inc per user per period | Already implemented in complete/route.ts; this phase adds Stripe MeterEvent alongside existing $inc |
| BILL-06 | Tier limit enforcement before presigned URL | Already implemented in request/route.ts; phase upgrades hard-block to soft-limit + upgrade CTA per D-07 |
| EMAIL-01 | Welcome email on signup (Resend + React Email) | Resend v6.10.0 already installed in dashboard; `@react-email/components` v1.0.11 needs adding |
| EMAIL-02 | Usage alert emails at 80% and 100% | Trigger point: after `$inc` in complete handler; compare new total vs TIER_LIMITS |
| EMAIL-03 | Invoice/payment emails (paid, failed) | Triggered by invoice.paid / invoice.payment_failed webhook events |
</phase_requirements>

---

## Summary

Phase 7 connects three existing code paths into a live billing and email system: (1) the `upload/request` and `upload/complete` routes already have tier-checking and `$inc` usage tracking; (2) the `Subscription` and `UsageRecord` models in `packages/db` have all necessary fields; (3) Resend is already installed in `apps/dashboard`. The primary new work is the Stripe integration layer — Checkout Session creation, Billing Portal, webhook handler, and Meters API — plus React Email templates and the email trigger logic.

The Stripe SDK is at v22.0.1 (confirmed via npm registry). This version uses `new Stripe(key, { apiVersion: '2025-03-31.basil' })` constructor syntax and the current Meters API surface (`stripe.billing.meters`, `stripe.billing.meterEvents`). Legacy `UsageRecord` endpoints are gone as of that API version.

React Email `@react-email/components` is at v1.0.11 (confirmed via npm registry). The template authoring model is: write React components → `renderAsync(Component, props)` returns an HTML string → pass to `resend.emails.send({ html: ... })`. No special build step is needed; rendering happens at send time in Node.js runtime route handlers.

**Primary recommendation:** Build in four sequential waves — (1) Stripe infrastructure setup (Checkout, Portal, webhook handler, Subscription sync), (2) Meters API integration alongside the existing `$inc` calls, (3) tier limit upgrade (soft-limit + CTA), (4) React Email templates + send triggers.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | 22.0.1 | Stripe API client — Checkout, Billing Portal, Webhooks, Meters | [VERIFIED: npm registry] Only official SDK; v22 required for `new Stripe()` constructor and Meters API |
| @react-email/components | 1.0.11 | Pre-built cross-client email components (Html, Body, Button, Text, etc.) | [VERIFIED: npm registry] Designed to pair with Resend; renders to cross-client HTML |
| react-email | 5.2.10 | `render()`/`renderAsync()` function to convert React Email components to HTML string | [VERIFIED: npm registry] Needed for server-side rendering of templates |
| resend | 6.10.0 | Email delivery SDK | [VERIFIED: package.json in apps/dashboard] Already installed; used for Auth.js magic links in Phase 2 |

### Already Installed (No New Install Needed)

| Library | Location | Phase 7 Use |
|---------|----------|-------------|
| resend ^6.10.0 | apps/dashboard | EMAIL-01, EMAIL-02, EMAIL-03 triggers from dashboard server actions |
| @uploadkit/db | workspace | Subscription + UsageRecord models already have all required fields |
| @uploadkit/shared | workspace | TIER_LIMITS already defined; 80%/100% threshold calculation uses these |

### New Dependencies to Add

```bash
# In apps/api (webhook handler, Meters API)
pnpm add stripe --filter @uploadkit/api

# In apps/dashboard (Checkout session creation, Billing Portal, email templates)
pnpm add stripe @react-email/components react-email --filter @uploadkit/dashboard
```

**Note:** `stripe` goes in both apps. The API app handles webhooks and fires MeterEvents. The dashboard creates Checkout Sessions and Billing Portal sessions via internal API routes.

---

## Architecture Patterns

### Recommended Project Structure — New Files

```
apps/api/src/
├── app/api/v1/
│   ├── billing/
│   │   ├── checkout/route.ts     # POST — create Checkout Session
│   │   └── portal/route.ts       # POST — create Billing Portal session
│   └── webhooks/
│       └── stripe/route.ts       # POST — Stripe webhook handler
├── lib/
│   └── stripe.ts                 # Singleton Stripe client
│
apps/dashboard/src/
├── app/
│   ├── api/
│   │   └── internal/             # Already exists
│   │       └── billing/          # New internal routes for dashboard
│   └── dashboard/billing/
│       └── page.tsx              # Replace disabled buttons with real actions
│
packages/
└── emails/                       # New package (or directory in apps/dashboard)
    ├── templates/
    │   ├── welcome.tsx
    │   ├── usage-alert.tsx
    │   └── invoice.tsx
    └── index.ts                  # Export renderWelcome(), renderUsageAlert(), renderInvoice()
```

**Decision point (Claude's discretion):** The emails can live either as a `packages/emails` workspace package (reusable across apps) or as `apps/dashboard/src/emails/`. Since only the dashboard app triggers these emails, a directory inside the dashboard app is simpler. A separate package only adds value if the API app also sends emails directly — which D-08 requires (alert emails are triggered from `upload/complete` which lives in `apps/api`). **Recommendation: `packages/emails` as a workspace package** so both API and dashboard apps can import from `@uploadkit/emails`.

### Pattern 1: Stripe Singleton Client

Both apps need a shared Stripe client. Create `lib/stripe.ts` in each app (not a shared package, since API versions may differ per app in theory, but in practice both should use the same pinned version).

```typescript
// apps/api/src/lib/stripe.ts  (and same in apps/dashboard/src/lib/stripe.ts)
// Source: [VERIFIED: Stripe Node.js SDK docs — new Stripe() constructor in v12+]
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil',
});
```

**Critical:** `apiVersion: '2025-03-31.basil'` must be set explicitly. Without it, the SDK defaults to the version it was released with, which may differ from the Stripe Dashboard version used to create Meters and Products. Pinning prevents unexpected behavior on future SDK upgrades. [VERIFIED: Stripe Node.js SDK changelog — basil API version required for Meters]

### Pattern 2: Stripe Webhook Handler

The webhook handler does NOT use `withApiKey` — it's authenticated via Stripe signature verification. This is the same pattern as the QStash DLQ handler (signature-only, no API key).

```typescript
// apps/api/src/app/api/v1/webhooks/stripe/route.ts
// Source: [CITED: https://docs.stripe.com/webhooks/signature-verification]
export const runtime = 'nodejs'; // Required — stripe.webhooks.constructEvent uses Node.js crypto

import Stripe from 'stripe';
import { type NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { connectDB, Subscription } from '@uploadkit/db';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text(); // Must be raw text — parsed body breaks HMAC
  const sig = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  await connectDB();

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object);
      break;
    default:
      // Unknown events — return 200 so Stripe doesn't retry
      break;
  }

  return NextResponse.json({ received: true });
}
```

**Important:** Return HTTP 200 for all processed events AND for unrecognized event types. Stripe retries on non-2xx responses — returning 400 for unknown events causes endless retries. [CITED: https://docs.stripe.com/webhooks/best-practices]

### Pattern 3: Checkout Session Creation

The session must include `metadata` with the `userId` so the webhook can identify which user completed checkout.

```typescript
// Source: [CITED: https://docs.stripe.com/checkout/quickstart]
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer: subscription.stripeCustomerId, // Look up from Subscription model
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
  metadata: { userId: session.user.id }, // Critical for webhook reconciliation
  subscription_data: {
    metadata: { userId: session.user.id }, // Also on subscription object
  },
});
return NextResponse.redirect(session.url!);
```

### Pattern 4: Stripe Meters API — MeterEvent Reporting

```typescript
// Source: [CITED: https://docs.stripe.com/billing/subscriptions/usage-based/implementation-guide]
// Fire one MeterEvent per upload, immediately after the upload $inc in complete/route.ts

await stripe.billing.meterEvents.create({
  event_name: 'uploadkit_storage_bytes',    // Must match Meter.event_name in Stripe Dashboard
  payload: {
    value: String(file.size),               // Must be a string, not a number
    stripe_customer_id: subscription.stripeCustomerId,
  },
  identifier: `upload_${file._id.toString()}`, // Idempotency key — prevents double-count on retry
});
```

**Three meters needed:**
1. `uploadkit_storage_bytes` — storage overage ($0.02/GB/mo)
2. `uploadkit_bandwidth_bytes` — bandwidth overage ($0.01/GB)
3. `uploadkit_upload_count` — upload count overage ($0.001/upload)

**Meter configuration:**
- `aggregate_usage: 'sum'` — all values in the billing period are summed
- `default_aggregation.formula: 'sum'` — same requirement at the price level

**Note:** Meters must be created in the Stripe Dashboard or via `stripe.billing.meters.create()` before MeterEvents will be accepted. The `event_name` string must match exactly. [CITED: https://docs.stripe.com/billing/subscriptions/usage-based/implementation-guide]

### Pattern 5: Soft Limit Enforcement with Upgrade CTA

The existing hard-block in `upload/request/route.ts` at step 5 and 6 becomes a soft limit with a Stripe-style error message:

```typescript
// Replace the hard TierLimitError with a soft check + CTA
const storagePercent =
  ((record?.storageUsed ?? 0) + fileSize) / TIER_LIMITS[ctx.tier].maxStorageBytes;

if (storagePercent > 1.0 && ctx.tier === 'FREE') {
  // Hard block only on FREE tier — soft limit on paid tiers per D-04
  return serializeError(new TierLimitError('storage'));
}
// For paid tiers: allow through — overage is billed via Stripe Meters
```

**Per D-04:** Uploads continue past 100% for paid tiers — overage is billed. The 80%/100% threshold only triggers email alerts, not blocking. The `FREE` tier remains hard-blocked since there's no Stripe customer to bill overage to.

### Pattern 6: Usage Alert Email Trigger

In `upload/complete/route.ts`, after the `$inc` at step 5:

```typescript
// After: await UsageRecord.findOneAndUpdate(...$inc...)
// Check thresholds and send alert if threshold just crossed

const newTotal = (record?.storageUsed ?? 0) + file.size;
const limit = TIER_LIMITS[ctx.tier].maxStorageBytes;
const prevPercent = (record?.storageUsed ?? 0) / limit;
const newPercent = newTotal / limit;

if (prevPercent < 0.8 && newPercent >= 0.8) {
  void sendUsageAlertEmail(ctx.project.userId, 80, 'storage');
}
if (prevPercent < 1.0 && newPercent >= 1.0) {
  void sendUsageAlertEmail(ctx.project.userId, 100, 'storage');
}
```

Fire-and-forget (`void`) — email delivery failure must not block the upload response. [ASSUMED]

### Pattern 7: React Email Template Structure

```typescript
// packages/emails/src/templates/usage-alert.tsx
// Source: [CITED: https://react.email/docs/getting-started/automatic-setup]
import {
  Html, Head, Body, Container, Heading, Text, Button, Section, Hr, Img,
} from '@react-email/components';

interface UsageAlertEmailProps {
  userName: string;
  usagePercent: number;   // 80 or 100
  dimension: string;       // 'storage', 'uploads', 'bandwidth'
  tier: string;
  upgradeUrl: string;
}

export function UsageAlertEmail({ userName, usagePercent, dimension, tier, upgradeUrl }: UsageAlertEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#0a0a0b' }}>
        <Container>
          {/* UploadKit branded header + content + CTA button */}
          <Button href={upgradeUrl}>Upgrade now</Button>
        </Container>
      </Body>
    </Html>
  );
}

// packages/emails/src/index.ts
import { render } from 'react-email';
import { UsageAlertEmail } from './templates/usage-alert';

export async function renderUsageAlert(props: UsageAlertEmailProps): Promise<string> {
  return render(<UsageAlertEmail {...props} />);
}
```

Sending:
```typescript
const html = await renderUsageAlert({ userName, usagePercent: 80, ... });
await resend.emails.send({
  from: 'UploadKit <noreply@uploadkit.dev>',
  to: userEmail,
  subject: `You've used 80% of your storage limit`,
  html,
});
```

### Anti-Patterns to Avoid

- **Using `req.json()` in the webhook handler:** The Stripe HMAC is computed over the raw request body. Calling `req.json()` parses and re-serializes, breaking the signature. Always use `req.text()`. [CITED: Stripe webhook docs]
- **Returning non-200 for unrecognized events:** Stripe will retry indefinitely. Return `{ received: true }` with 200 for any event type the handler does not recognize.
- **Storing Stripe Meter summaries as usage data:** Meter events are write-only. Never query Stripe's meter summary API to power the in-app usage page — always read from `UsageRecord` in MongoDB.
- **Missing `identifier` on MeterEvents:** Without an idempotency key, Stripe double-counts on retries. Use the MongoDB `file._id.toString()` as identifier since it is unique per upload.
- **Creating a Stripe Customer on every Checkout:** The `Subscription` model already has a `stripeCustomerId` field. Create the customer once (on first signup or first billing action) and reuse. Check `Subscription.findOne({ userId })` before calling `stripe.customers.create()`.
- **Sending email synchronously in the upload path:** Email delivery adds ~100–500ms latency. Always fire-and-forget with `void`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook signature verification | Custom HMAC check | `stripe.webhooks.constructEvent()` | Handles timing attacks, encoding edge cases |
| Email HTML | Raw HTML strings | `@react-email/components` + `render()` | Cross-client compatibility, Outlook quirks, dark mode, RTL |
| Checkout payment form | Custom payment fields | Stripe Checkout (hosted) | PCI compliance, 3DS, Apple/Google Pay, 40+ payment methods |
| Subscription state machine | Custom status transitions | Stripe webhooks → update Subscription model | Stripe handles trial expiry, grace periods, dunning |
| Invoice list display | Query Stripe API on every page load | `stripe.invoices.list({ customer })` cached via Stripe | Invoice history lives in Stripe — don't duplicate to MongoDB |
| Meter aggregation | Sum events in MongoDB | Stripe Meters API | Stripe handles billing period reset, currency conversion, invoice line items |

**Key insight:** Stripe is the billing source of truth. MongoDB's `UsageRecord` is the in-app display source of truth. Never conflate the two.

---

## Common Pitfalls

### Pitfall 1: Webhook Handler Receives Parsed Body (Signature Fails)

**What goes wrong:** `stripe.webhooks.constructEvent(body, sig, secret)` throws `No signatures found matching the expected signature`. All webhooks return 400 and Stripe retries indefinitely.

**Why it happens:** Next.js Route Handlers calling `await req.json()` parse the JSON body. The parsed body, when converted back to a string, may differ from the original raw bytes (whitespace, key ordering) that Stripe used to compute the HMAC.

**How to avoid:** Always `const body = await req.text()` in the webhook handler — never `req.json()`. Parse the event from the `Stripe.Event` returned by `constructEvent`, not from the request body directly.

**Warning signs:** `WebhookSignatureVerificationError` in Sentry logs.

### Pitfall 2: Free-Tier User Has No stripeCustomerId (MeterEvent Fails)

**What goes wrong:** `stripe.billing.meterEvents.create()` throws because Free users don't have a Stripe Customer ID.

**Why it happens:** MeterEvents must reference a `stripe_customer_id`. Free users who have never opened a Checkout session have no Stripe customer.

**How to avoid:** Check `subscription.stripeCustomerId` before sending MeterEvents. For FREE tier users, skip MeterEvents — there is no subscription to bill overage against. Only send MeterEvents for ACTIVE paid subscriptions (PRO, TEAM, ENTERPRISE).

**Warning signs:** `resource_missing` error from Stripe in server logs.

### Pitfall 3: Duplicate Subscription Created on Checkout Completion

**What goes wrong:** `checkout.session.completed` fires twice (Stripe guarantees at-least-once delivery). Two Subscription records are created for the same user, or `stripeSubscriptionId` gets overwritten with a different value.

**Why it happens:** Webhooks are at-least-once. If the handler times out or returns non-200 on the first attempt, Stripe retries. If the handler is idempotent but slow, the race between two deliveries creates a duplicate.

**How to avoid:** Use MongoDB's `upsert: true` with `findOneAndUpdate({ userId })` when syncing subscription state. The `unique: true` constraint on `stripeSubscriptionId` provides a safety net but upsert prevents the race.

```typescript
await Subscription.findOneAndUpdate(
  { userId },
  { $set: { tier, status, stripeSubscriptionId, stripePriceId, currentPeriodEnd } },
  { upsert: true, new: true },
);
```

### Pitfall 4: Billing Portal Fails Without Prior Customer Portal Configuration

**What goes wrong:** `stripe.billingPortal.sessions.create()` throws `You must create a customer portal configuration.`

**Why it happens:** The Stripe Billing Portal requires a portal configuration to be set up in the Stripe Dashboard (or via API) before sessions can be created. This is a one-time setup step that is easy to miss in automated testing.

**How to avoid:** Before implementing the Billing Portal route, set up the portal configuration in Stripe Dashboard → Billing → Customer Portal. Configure: allowed cancellation, allowed plan changes, allowed payment method updates. [CITED: https://docs.stripe.com/customer-management/portal-configuration]

### Pitfall 5: Usage Alert Fires on Every Upload After Threshold (Not Just the Crossing)

**What goes wrong:** Every upload after the 80% threshold fires another 80% alert email. Users get spammed.

**Why it happens:** The threshold check compares current total to limit without tracking whether the alert was already sent.

**How to avoid:** The crossing detection pattern (compare `prevPercent < 0.8 && newPercent >= 0.8`) fires only once per threshold crossing. This naturally prevents duplicate alerts because once `storageUsed` is above 80%, the `prevPercent < 0.8` condition is false for all subsequent uploads.

**Edge case:** If a user deletes files and drops back below 80%, then uploads again, the alert should fire again. This is correct behavior — the crossing check handles this naturally.

### Pitfall 6: React Email renderAsync vs render

**What goes wrong:** Import `render` from `@react-email/render` (old package) instead of `react-email` (current). Or use `render()` in an async context without `await` on `renderAsync()`.

**How to avoid:** As of react-email 5.x, import `render` or `renderAsync` from `react-email`, not the old `@react-email/render` package. The `renderAsync` variant is preferred for server-side Next.js route handlers.

```typescript
import { render } from 'react-email';
// or async variant:
import { renderAsync } from 'react-email';
const html = await renderAsync(<WelcomeEmail {...props} />);
```

[CITED: https://react.email/docs/utilities/render]

---

## Code Examples

### Stripe Customer Provisioning (One-Time, On Signup)

```typescript
// Called during Auth.js signIn callback or on first billing page visit
// Source: [CITED: https://docs.stripe.com/api/customers/create]
const existing = await Subscription.findOne({ userId });
if (!existing?.stripeCustomerId) {
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId: user.id },
  });
  await Subscription.findOneAndUpdate(
    { userId },
    { $set: { stripeCustomerId: customer.id } },
    { upsert: true },
  );
}
```

### Checkout Session (Pro Upgrade)

```typescript
// Source: [CITED: https://docs.stripe.com/checkout/quickstart]
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer: subscription.stripeCustomerId,
  line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=1`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
  metadata: { userId },
  subscription_data: { metadata: { userId } },
});
```

### Webhook: checkout.session.completed Handler

```typescript
// Source: [CITED: https://docs.stripe.com/billing/subscriptions/webhooks]
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId || !session.subscription) return;

  const sub = await stripe.subscriptions.retrieve(session.subscription as string);
  const priceId = sub.items.data[0]?.price.id;
  const tier = priceIdToTier(priceId); // Map STRIPE_PRO_PRICE_ID → 'PRO' etc.

  await Subscription.findOneAndUpdate(
    { userId },
    {
      $set: {
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId,
        tier,
        status: 'ACTIVE',
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
    },
    { upsert: true, new: true },
  );
}
```

### Billing Portal Session

```typescript
// Source: [CITED: https://docs.stripe.com/customer-management/integrate-customer-portal]
const portalSession = await stripe.billingPortal.sessions.create({
  customer: subscription.stripeCustomerId,
  return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
});
return NextResponse.redirect(portalSession.url);
```

### Sending Welcome Email via Resend

```typescript
// Source: [CITED: https://resend.com/docs/send/with-react-email]
import { renderAsync } from 'react-email';
import { WelcomeEmail } from '@uploadkit/emails';

const html = await renderAsync(<WelcomeEmail userName={user.name} />);
await resend.emails.send({
  from: 'UploadKit <welcome@uploadkit.dev>',
  to: user.email,
  subject: 'Welcome to UploadKit',
  html,
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `stripe.subscriptionItems.createUsageRecord()` | `stripe.billing.meterEvents.create()` | API `2025-03-31.basil` | Legacy UsageRecord removed; all metered billing requires Meter objects |
| `Stripe()` called as a function | `new Stripe()` constructor | Stripe SDK v12+ | Must use `new` — calling as function throws TypeError in newer SDK versions |
| `@react-email/render` package | Import `render`/`renderAsync` from `react-email` | react-email v3+ | Old package deprecated; canonical import from `react-email` package |

**Deprecated/outdated:**
- `stripe.usageRecords.create()`: removed in API version `2025-03-31.basil`
- `Stripe()` without `new`: throws in SDK v12+ [ASSUMED — based on STACK.md note and Stripe changelog]

---

## Integration Points — Existing Code

### 1. `upload/complete/route.ts` — Two Additions Needed

The existing `$inc` at step 5 is the injection point for both MeterEvents (BILL-04) and alert emails (EMAIL-02). After the `findOneAndUpdate`, add:
- Fire MeterEvent to Stripe (skip if FREE tier or no `stripeCustomerId`)
- Check 80%/100% threshold crossing and trigger alert email (fire-and-forget)

No structural changes to the route — just additions after the existing `$inc` call.

### 2. `upload/request/route.ts` — Soft Limit Upgrade (BILL-06)

The existing hard-block at steps 5 and 6 needs to become a soft limit for paid tiers per D-04. FREE tier stays hard-blocked. Paid tiers pass through with no error — overage is billed via Stripe.

The D-07 upgrade CTA requirement applies: when rejecting FREE tier users, include a `suggestion` field pointing to the billing upgrade URL, consistent with the existing `UploadKitError` `suggestion` field pattern in `serializeError`.

### 3. `apps/dashboard/billing/page.tsx` — Three Additions Needed

The existing shell has two disabled buttons. Phase 7 replaces them with:
- "Upgrade to Pro" → `<form action={createCheckoutAction}>` (Server Action or form POST to internal API route)
- "Manage Billing" → `<a href>` pointing to a portal session endpoint
- Invoice history table → real data from `stripe.invoices.list({ customer })`

### 4. `Subscription` Model — No Schema Changes Needed

The model already has all fields needed: `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `tier`, `status`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`. The webhook handlers write to all of these. [VERIFIED: packages/db/src/models/subscription.ts]

### 5. `UsageRecord` Model — No Schema Changes Needed

`storageUsed`, `bandwidth`, `uploads` fields with `{ userId, period }` compound unique index are already present. The alert email trigger reads these values post-`$inc`. [VERIFIED: packages/db/src/models/usage-record.ts]

### 6. `TIER_LIMITS` — No Changes Needed

All tier limits are already defined in `packages/shared/src/constants.ts`. The 80%/100% thresholds are computed as `currentUsage / TIER_LIMITS[tier].maxStorageBytes`. [VERIFIED: packages/shared/src/constants.ts]

---

## Environment Variables — New for Phase 7

The `.env.example` already has `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` as empty placeholders. New vars needed:

```env
# Stripe (apps/api + apps/dashboard)
STRIPE_SECRET_KEY=sk_test_...          # Already in .env.example
STRIPE_WEBHOOK_SECRET=whsec_...        # Already in .env.example
STRIPE_PRO_PRICE_ID=price_...          # New — Stripe Dashboard price ID for Pro plan
STRIPE_TEAM_PRICE_ID=price_...         # New — Stripe Dashboard price ID for Team plan

# Resend (apps/dashboard — already in .env.example as RESEND_API_KEY)
RESEND_API_KEY=re_...                  # Already present

# Stripe Meter event names (apps/api) — optionally config-driven
STRIPE_METER_STORAGE_EVENT=uploadkit_storage_bytes
STRIPE_METER_BANDWIDTH_EVENT=uploadkit_bandwidth_bytes
STRIPE_METER_UPLOADS_EVENT=uploadkit_upload_count
```

The `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` from `UPLOADKIT-GSD.md §10` is NOT needed — D-01 uses hosted Checkout, not Stripe Elements, so no publishable key is required in the browser.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (already configured at monorepo root) |
| Config file | `vitest.config.ts` at monorepo root |
| Quick run command | `pnpm vitest run --filter @uploadkit/api` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| BILL-01 | Checkout session returns redirect URL with Stripe hosted URL | unit/mock | `vitest run apps/api/src/app/api/v1/billing/checkout` | Mock `stripe.checkout.sessions.create` |
| BILL-02 | Billing Portal session returns redirect URL | unit/mock | `vitest run apps/api/src/app/api/v1/billing/portal` | Mock `stripe.billingPortal.sessions.create` |
| BILL-03 | Webhook with valid signature updates Subscription | unit/mock | `vitest run apps/api/src/app/api/v1/webhooks/stripe` | Use `stripe.webhooks.generateTestHeaderString` to create valid test signatures |
| BILL-03 | Webhook with invalid signature returns 400 | unit | Same file | Test security boundary |
| BILL-04 | MeterEvent fired after upload complete | unit | `vitest run apps/api/src/app/api/v1/upload/complete` | Spy on `stripe.billing.meterEvents.create` |
| BILL-04 | MeterEvent NOT fired for FREE tier | unit | Same file | Free users have no `stripeCustomerId` |
| BILL-05 | `$inc` still works correctly (existing) | unit | Already tested in Phase 3 | No regression expected |
| BILL-06 | FREE tier upload blocked when over 100% | unit | `vitest run apps/api/src/app/api/v1/upload/request` | Assert 429/403 response |
| BILL-06 | PRO tier upload passes when over 100% (soft limit) | unit | Same file | Assert presigned URL returned |
| EMAIL-01 | Welcome email sends on signup | manual | Manual trigger via Resend test mode | Auth.js signIn callback |
| EMAIL-02 | 80% alert email fires exactly once at threshold crossing | unit | `vitest run upload/complete` | Spy on `resend.emails.send` |
| EMAIL-03 | Invoice email fires on invoice.paid webhook | unit | Webhook handler test | Spy on `resend.emails.send` |

### Wave 0 Gaps

- [ ] `apps/api/src/app/api/v1/billing/checkout/route.test.ts` — covers BILL-01
- [ ] `apps/api/src/app/api/v1/billing/portal/route.test.ts` — covers BILL-02
- [ ] `apps/api/src/app/api/v1/webhooks/stripe/route.test.ts` — covers BILL-03
- [ ] `packages/emails/src/templates/welcome.test.tsx` — renders without error
- [ ] `packages/emails/src/templates/usage-alert.test.tsx` — renders without error

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Stripe webhook signature via `stripe.webhooks.constructEvent()` |
| V3 Session Management | no | Checkout is stateless redirect; portal sessions are short-lived Stripe URLs |
| V4 Access Control | yes | Billing routes must verify `session.user.id` matches subscription's `userId` before creating portal |
| V5 Input Validation | yes | Webhook body: raw text only; Checkout: `priceId` must be validated against known env var values |
| V6 Cryptography | yes | Stripe HMAC-SHA256 signature — never roll custom verification |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged Stripe webhook | Spoofing | `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET` |
| User upgrades another user's subscription | Elevation of Privilege | Lookup `Subscription.findOne({ userId: session.user.id })` — tie checkout session to authenticated user |
| Attacker sends fake `invoice.paid` to grant Pro tier | Tampering | Signature verification blocks all unauthenticated webhook events |
| Email enumeration via error messages | Information Disclosure | Send email fire-and-forget; never surface email send errors to API response |
| Overage MeterEvent replay attack | Tampering | `identifier` field on each MeterEvent prevents duplicate counting on retries |
| Access billing portal for another user | Elevation of Privilege | Portal session creation always reads `stripeCustomerId` from DB (keyed by authenticated `userId`), never from client input |

---

## Open Questions

1. **Where to create the Stripe Customer (stripeCustomerId)**
   - What we know: `Subscription` model has `stripeCustomerId: { type: String, required: true }` — it is a required field, but Free users have no Stripe account yet.
   - What's unclear: The model requires it, but free users signing up via Phase 2 auth don't go through Stripe at all. The `required: true` constraint will fail on `Subscription.create()` for free users without a customer ID.
   - Recommendation: Either change `stripeCustomerId` to non-required in the schema, or provision a Stripe Customer lazily on first billing page visit and upsert the Subscription record. The lazy approach is cleaner — create customer only when user is about to pay.

2. **Stripe Meter creation: API vs Dashboard**
   - What we know: Meters can be created via `stripe.billing.meters.create()` or manually in Stripe Dashboard.
   - What's unclear: For a managed codebase, API creation is more reproducible, but requires a one-time setup script.
   - Recommendation (Claude's discretion): Create a `scripts/setup-stripe.ts` that creates all 3 Meters idempotently. Run once per environment. Store meter IDs in env vars or in Stripe Dashboard.

3. **`STRIPE_METER_STORAGE_EVENT` name consistency**
   - What we know: The `event_name` in `stripe.billing.meterEvents.create()` must exactly match the `event_name` configured on the Stripe Meter object.
   - What's unclear: Whether to hardcode these strings or make them env vars.
   - Recommendation: Hardcode as constants in a `lib/stripe-meters.ts` file and document the required Stripe Dashboard configuration. Env vars add unnecessary indirection for string constants.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `renderAsync` is the preferred import from `react-email` v5 | Code Examples | Template rendering could fail; check react-email v5 docs for exact export names |
| A2 | Fire-and-forget (`void`) on email send is sufficient — failures are non-fatal | Pattern 6 (alert emails) | If email reliability is critical, switch to a queue-based approach |
| A3 | Free tier remains hard-blocked on storage/upload limits; paid tiers get soft limit | Pattern 5 | Business decision — if all tiers should be soft-blocked, all limit checks change |
| A4 | `new Stripe()` without `new` throws in SDK v22 | State of the Art | STACK.md notes this; not independently re-verified against SDK v22 release notes |

---

## Environment Availability

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| stripe npm package | BILL-01..04, EMAIL-03 | Not yet installed | Add to apps/api and apps/dashboard via pnpm |
| @react-email/components | EMAIL-01..03 | Not yet installed | Add to packages/emails (new) |
| react-email | EMAIL-01..03 | Not yet installed | Add to packages/emails (new) |
| resend npm package | EMAIL-01..03 | Already installed (v6.10.0 in apps/dashboard) | Needs to be available in packages/emails or via shared lib |
| Stripe account + test keys | All BILL-* | Requires env vars — not verified | `STRIPE_SECRET_KEY` slot exists in `.env.example` |
| Stripe Billing Meter objects | BILL-04 | Requires one-time setup | Must create meters before MeterEvents will be accepted |
| Stripe Customer Portal config | BILL-02 | Requires one-time setup in Stripe Dashboard | Portal sessions fail without configuration |

**Missing dependencies with no fallback:**
- Stripe test API keys must be provided in `.env.local` before any billing routes can be developed/tested. There is no mock fallback for the webhook signature verification.

**Missing dependencies with fallback:**
- React Email rendering can be tested with `render()` locally without a Resend account; actual delivery requires `RESEND_API_KEY`.

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: npm registry] `stripe@22.0.1` — current version confirmed
- [VERIFIED: npm registry] `@react-email/components@1.0.11` — current version confirmed
- [VERIFIED: npm registry] `react-email@5.2.10` — current version confirmed
- [VERIFIED: package.json] `resend@^6.10.0` already in apps/dashboard
- [VERIFIED: codebase] `packages/db/src/models/subscription.ts` — schema field inventory
- [VERIFIED: codebase] `packages/db/src/models/usage-record.ts` — schema field inventory
- [VERIFIED: codebase] `packages/shared/src/constants.ts` — TIER_LIMITS values confirmed
- [VERIFIED: codebase] `apps/api/src/app/api/v1/upload/complete/route.ts` — `$inc` injection point confirmed
- [VERIFIED: codebase] `apps/api/src/app/api/v1/upload/request/route.ts` — tier check injection point confirmed
- [VERIFIED: codebase] `apps/api/src/app/api/v1/webhooks/qstash-dlq/route.ts` — established webhook pattern
- [VERIFIED: codebase] `apps/dashboard/src/app/dashboard/billing/page.tsx` — existing shell reviewed

### Secondary (MEDIUM confidence)
- [CITED: .planning/research/STACK.md] Stripe Meters API — `stripe.billing.meters` / `stripe.billing.meterEvents`, `new Stripe()` constructor, API version `2025-03-31.basil`
- [CITED: .planning/research/PITFALLS.md] Pitfall 7 — legacy UsageRecord removed; idempotency key requirement for MeterEvents
- [CITED: UPLOADKIT-GSD.md §8] Webhook events to handle; pricing: $0.02/GB storage, $0.01/GB BW, $0.001/upload
- [CITED: https://react.email/docs/utilities/render] `renderAsync` import from `react-email`
- [CITED: https://docs.stripe.com/webhooks/best-practices] Return 200 for all event types

### Tertiary (LOW confidence)
- [ASSUMED] `void` fire-and-forget sufficient for email triggers in upload path
- [ASSUMED] `new Stripe()` without `new` throws in v22 (inferred from STACK.md note, not re-verified)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry verified, existing package.json inspected
- Architecture: HIGH — derived from existing code patterns (QStash DLQ, upload handlers) with well-known Stripe patterns
- Pitfalls: HIGH — sourced from project PITFALLS.md (research-verified) plus common Stripe gotchas
- Email templates: MEDIUM — React Email API surface verified via npm, but exact import paths [ASSUMED] for v5

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (Stripe API version pinned; `react-email` fast-moving but render API stable)
