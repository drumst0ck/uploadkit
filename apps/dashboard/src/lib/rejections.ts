/** Shared helpers for the Rejected uploads view (API route and page). */

export const REJECTED_PAGE_SIZE = 50;
export const REJECTED_MAX_ROUTER_LENGTH = 255;

/** Allowed time ranges. Every window stays inside the 30-day TTL of UploadRejection. */
export const REJECTED_RANGES = {
  '1h': { label: 'Last hour', ms: 60 * 60 * 1000 },
  '24h': { label: 'Last 24 hours', ms: 24 * 60 * 60 * 1000 },
  '7d': { label: 'Last 7 days', ms: 7 * 24 * 60 * 60 * 1000 },
} as const;

export type RejectedRange = keyof typeof REJECTED_RANGES;
export const DEFAULT_REJECTED_RANGE: RejectedRange = '7d';

export function isRejectedRange(value: string): value is RejectedRange {
  return Object.prototype.hasOwnProperty.call(REJECTED_RANGES, value);
}

/**
 * A rejection is "plan-limit" when the plan (not the router) caused it:
 * quota reached, or file over the plan's size limit.
 */
export function isPlanLimitRejection(code: string, reason: string): boolean {
  if (code === 'QUOTA_EXCEEDED') return true;
  return code === 'FILE_TOO_LARGE' && !/router limit/i.test(reason);
}
