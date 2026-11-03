import { NotFoundError } from '@uploadkitdev/shared';
import type { ApiContext } from '@/lib/with-api-key';

/** A project API key is not a user-wide administration credential. */
export function assertProjectScope(ctx: ApiContext, targetId: unknown, resource = 'Project', resourceId?: string): void {
  if (String(targetId) !== String(ctx.project._id)) {
    throw new NotFoundError(resource, resourceId ?? String(targetId));
  }
}
