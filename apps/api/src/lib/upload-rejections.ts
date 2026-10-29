import { UploadRejection } from '@uploadkitdev/db';
import { TIER_LIMITS } from '@uploadkitdev/shared';
import type { ApiContext } from './with-api-key';

/**
 * Persist a record of an upload the API refused, so the dashboard can show it
 * in a "Rejected uploads" view.
 *
 * Contract: this function NEVER throws and NEVER changes the caller's response.
 *
 * Write strategy: awaited best-effort with a hard timeout (WRITE_TIMEOUT_MS).
 * Fire-and-forget is not used because on serverless runtimes work still pending
 * after the response is returned can be frozen or dropped, losing the record.
 * Awaiting costs at most one indexed count + one insert, and the timeout bounds
 * the worst case so a slow or down database cannot hold the refusal response.
 *
 * Abuse guard: at most MAX_PER_PROJECT_PER_MINUTE rows per project per rolling
 * minute (indexed count on projectId+createdAt). A client hammering refusals
 * cannot grow the collection beyond that rate; the 30-day TTL index bounds the
 * total. Only authenticated, project-scoped requests reach this code (it takes
 * an ApiContext), so unauthenticated traffic can never write.
 */
export type RejectionCode = 'FILE_TOO_LARGE' | 'TYPE_NOT_ALLOWED' | 'QUOTA_EXCEEDED';

export const MAX_PER_PROJECT_PER_MINUTE = 20;
const WRITE_TIMEOUT_MS = 750;
const TIER_LABEL: Record<string, string> = { FREE: 'Free', PRO: 'Pro', TEAM: 'Team', ENTERPRISE: 'Enterprise' };

export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${+(mb / 1024).toFixed(1)} GB`;
  if (mb >= 1) return `${+mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Strip path segments and control chars, cap at 255 chars. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 255);
  return clean || 'unnamed';
}

/** Which limit made the file too large: the router's or the plan's. */
export function fileTooLargeReason(routerMax: number, ctx: ApiContext): string {
  const planMax = TIER_LIMITS[ctx.tier].maxFileSizeBytes;
  return routerMax <= planMax
    ? `Over ${formatBytes(routerMax)} router limit`
    : `Over ${formatBytes(planMax)} ${TIER_LABEL[ctx.tier] ?? ctx.tier} limit`;
}

export function quotaReason(kind: 'storage' | 'uploads', ctx: ApiContext): string {
  const plan = TIER_LABEL[ctx.tier] ?? ctx.tier;
  return kind === 'storage'
    ? `Storage quota reached on ${plan} plan`
    : `Monthly upload limit reached on ${plan} plan`;
}

export interface RejectionInput {
  routerSlug: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  code: RejectionCode;
  reason: string;
}

async function write(ctx: ApiContext, input: RejectionInput): Promise<void> {
  const recent = await UploadRejection.countDocuments({
    projectId: ctx.project._id,
    createdAt: { $gte: new Date(Date.now() - 60_000) },
  });
  if (recent >= MAX_PER_PROJECT_PER_MINUTE) return;
  await UploadRejection.create({
    projectId: ctx.project._id,
    userId: ctx.project.userId,
    routerSlug: input.routerSlug.slice(0, 255),
    fileName: sanitizeFileName(input.fileName),
    fileSize: input.fileSize,
    fileType: (input.fileType ?? '').slice(0, 255),
    code: input.code,
    reason: input.reason,
  });
}

export async function recordUploadRejection(ctx: ApiContext, input: RejectionInput): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      write(ctx, input),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, WRITE_TIMEOUT_MS);
      }),
    ]);
  } catch (err) {
    console.error('[upload-rejections] failed to record rejection', err);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
