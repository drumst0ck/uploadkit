import { describe, expect, it } from 'vitest';
import { WebhookDelivery } from '../src/models/webhook-delivery';

describe('webhook delivery retention', () => {
  it('expires records 30 days after creation with a TTL index on createdAt', () => {
    expect(WebhookDelivery.schema.indexes()).toContainEqual([
      { createdAt: 1 }, expect.objectContaining({ expireAfterSeconds: 30 * 24 * 60 * 60 }),
    ]);
  });
  it('accepts the published status', () => {
    expect(new WebhookDelivery({ status: 'published' }).validateSync()?.errors['status']).toBeUndefined();
  });
});
