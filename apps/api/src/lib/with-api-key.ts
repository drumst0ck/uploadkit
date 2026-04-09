import { createHash } from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { connectDB, ApiKey, Subscription } from '@uploadkitdev/db';
import type { IApiKey, IProject } from '@uploadkitdev/db';
import { UnauthorizedError, RateLimitError } from '@uploadkitdev/shared';
import type { Tier } from '@uploadkitdev/shared';
import { ratelimit, uploadRatelimit } from './rate-limit';
import { serializeError } from './errors';

export interface ApiContext {
  apiKey: IApiKey;
  project: IProject;
  tier: Tier;
}

type Handler = (
  req: NextRequest,
  ctx: ApiContext,
  params?: Record<string, string | string[]>,
) => Promise<NextResponse>;

/**
 * Higher-order function that wraps a route handler with API key authentication
 * and rate limiting. Implements the auth flow per T-03-01 and T-03-05:
 *   1. Extract Bearer token from Authorization header
 *   2. Rate limit by token prefix (Upstash HTTP, no DB round-trip)
 *   3. Hash token with SHA256 and look up in DB
 *   4. Return ApiContext with apiKey, project, tier to inner handler
 *
 * @param handler - The inner route handler to wrap
 * @param useUploadLimit - Use the higher upload rate limit (30/min) instead of default (10/min)
 */
export function withApiKey(handler: Handler, useUploadLimit = false) {
  return async (
    req: NextRequest,
    segmentData: { params: Promise<Record<string, string | string[]>> },
  ): Promise<NextResponse> => {
    try {
      // 1. Extract Bearer token
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return serializeError(new UnauthorizedError());
      }
      const token = authHeader.slice(7).trim();
      if (!token) {
        return serializeError(new UnauthorizedError());
      }

      // 2. Rate limit BEFORE DB lookup (Upstash HTTP, no connection needed)
      const limiter = useUploadLimit ? uploadRatelimit : ratelimit;
      const rateLimitKey = `apikey:${token.slice(0, 20)}`;
      const { success, reset } = await limiter.limit(rateLimitKey);
      if (!success) {
        const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000);
        return serializeError(new RateLimitError(retryAfterSeconds));
      }

      // 3. Hash token with SHA256 and look up in DB
      await connectDB();
      const hash = createHash('sha256').update(token).digest('hex');
      const apiKeyDoc = await ApiKey.findOne({ keyHash: hash, revokedAt: null }).populate<{
        projectId: IProject;
      }>('projectId');

      if (!apiKeyDoc) {
        return serializeError(new UnauthorizedError());
      }

      // 4. Fire-and-forget lastUsedAt update (non-blocking)
      void ApiKey.updateOne(
        { _id: apiKeyDoc._id },
        { $set: { lastUsedAt: new Date() } },
      );

      const project = apiKeyDoc.projectId as unknown as IProject;
      // Cast populated doc back to IApiKey — at runtime projectId is the populated object,
      // but IApiKey declares it as ObjectId. The cast is safe because consumers use ctx.project.
      const apiKey = apiKeyDoc as unknown as IApiKey;

      // 5. Resolve subscription tier
      const subscription = await Subscription.findOne({
        userId: project.userId,
      });
      const tier: Tier = (subscription?.tier as Tier) ?? 'FREE';

      // 6. Await segment params for Next.js App Router compatibility
      const params = await segmentData.params;

      return handler(req, { apiKey, project, tier }, params);
    } catch (err) {
      return serializeError(err);
    }
  };
}
