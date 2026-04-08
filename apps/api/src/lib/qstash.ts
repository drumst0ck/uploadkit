import { Client } from '@upstash/qstash';

const qstashClient = process.env.QSTASH_TOKEN
  ? new Client({ token: process.env.QSTASH_TOKEN })
  : null;

export async function enqueueWebhook(
  url: string,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!qstashClient || !url) {
    console.warn('[dev] QStash not configured or no webhookUrl — skipping webhook delivery');
    return;
  }
  await qstashClient.publishJSON({
    url,
    body: payload,
    retries: 3,
  });
}
