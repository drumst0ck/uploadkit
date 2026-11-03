import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const publishJSON = vi.hoisted(() => vi.fn());
vi.mock('@upstash/qstash', () => ({ Client: class { publishJSON = publishJSON; } }));
vi.mock('@uploadkitdev/db', () => ({ WebhookDelivery: { create: vi.fn(), updateOne: vi.fn() } }));
import { WebhookDelivery } from '@uploadkitdev/db';
const context = { projectId: 'project', fileId: 'file', routeSlug: 'images' };
beforeEach(() => {
  vi.resetAllMocks();
  vi.resetModules();
  vi.stubEnv('QSTASH_TOKEN', 'test-token');
  vi.mocked(WebhookDelivery.create).mockResolvedValue({ _id: 'delivery' } as any);
});
afterEach(() => vi.unstubAllEnvs());

describe('durable webhook publication', () => {
  it('persists a pending delivery before publishing and marks it published once QStash admits it', async () => {
    publishJSON.mockImplementation(async () => {
      expect(WebhookDelivery.create).toHaveBeenCalledWith(expect.objectContaining({ ...context, status: 'pending', payload: { event: 'complete' } }));
      return { messageId: 'message' };
    });
    const { enqueueWebhook } = await import('@/lib/qstash');
    await (enqueueWebhook as any)('https://example.com/webhook', { event: 'complete' }, context);
    expect(WebhookDelivery.create).toHaveBeenCalledOnce();
    expect(publishJSON).toHaveBeenCalledOnce();
    expect(WebhookDelivery.updateOne).toHaveBeenCalledOnce();
    expect(WebhookDelivery.updateOne).toHaveBeenCalledWith({ _id: 'delivery' }, { $set: { status: 'published' } });
  });
  it('records publish rejection instead of leaving an unhandled promise', async () => {
    publishJSON.mockRejectedValue(new Error('QStash unavailable'));
    const { enqueueWebhook } = await import('@/lib/qstash');
    await expect((enqueueWebhook as any)('https://example.com/webhook', { event: 'complete' }, context)).resolves.toBeUndefined();
    expect(WebhookDelivery.updateOne).toHaveBeenCalledWith({ _id: 'delivery' }, { $set: expect.objectContaining({ status: 'failed', errorMessage: 'QStash unavailable' }) });
  });
  it('keeps a successful publication when marking it published fails', async () => {
    publishJSON.mockResolvedValue({ messageId: 'message' });
    vi.mocked(WebhookDelivery.updateOne).mockRejectedValue(new Error('DB down'));
    const { enqueueWebhook } = await import('@/lib/qstash');
    await expect((enqueueWebhook as any)('https://example.com/webhook', {}, context)).resolves.toBeUndefined();
    expect(WebhookDelivery.updateOne).toHaveBeenCalledTimes(1);
  });
  it('does not publish without a durable delivery record', async () => {
    vi.mocked(WebhookDelivery.create).mockRejectedValue(new Error('DB unavailable'));
    const { enqueueWebhook } = await import('@/lib/qstash');
    await expect((enqueueWebhook as any)('https://example.com/webhook', {}, context)).resolves.toBeUndefined();
    expect(publishJSON).not.toHaveBeenCalled();
  });
});
