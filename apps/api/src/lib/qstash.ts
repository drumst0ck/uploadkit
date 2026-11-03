import { Client } from '@upstash/qstash';
import { WebhookDelivery } from '@uploadkitdev/db';

const qstashClient = process.env.QSTASH_TOKEN ? new Client({ token: process.env.QSTASH_TOKEN }) : null;

/** Await publication admission (not webhook delivery) so serverless teardown
 * cannot discard the pending record. A successful admission marks the record `published`; failures are persisted/logged.
 */
export async function enqueueWebhook(
  url: string,
  payload: Record<string, unknown>,
  context: { projectId: string; fileId: string; routeSlug: string },
): Promise<void> {
  let delivery;
  try {
    delivery = await WebhookDelivery.create({ ...context, webhookUrl: url, payload, status: 'pending' });
    if (!qstashClient || !url) throw new Error('QStash is not configured or webhook URL is missing');
    await qstashClient.publishJSON({ url, body: payload, retries: 3 });
    // Admission succeeded; delivery itself is confirmed elsewhere (callbacks/DLQ).
    try {
      await WebhookDelivery.updateOne({ _id: delivery._id }, { $set: { status: 'published' } });
    } catch (markError) {
      console.error('[webhook] Failed to mark delivery published', markError);
    }
  } catch (error) {
    console.error('[webhook] Failed to enqueue delivery', error);
    if (delivery) {
      try {
        await WebhookDelivery.updateOne({ _id: delivery._id }, {
          $set: { status: 'failed', errorMessage: error instanceof Error ? error.message : 'Publication failed' },
        });
      } catch (recordError) {
        console.error('[webhook] Failed to persist publication error', recordError);
      }
    }
  }
}
