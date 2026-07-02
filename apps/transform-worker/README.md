# UploadKit Image Transform Worker

Cloudflare Worker responsible for serving stable public and expiring signed image transformations from UploadKit's managed R2 bucket. It deliberately has no access to customer BYOS buckets.

## Bindings

- `UPLOADS`: the managed UploadKit R2 bucket.
- `IMAGES`: Cloudflare Images binding.
- `IMAGE_TRANSFORM_SECRET`: HMAC secret shared with the API service.
- `IMAGE_TRANSFORM_SECRET_PREVIOUS`: optional previous HMAC secret during a zero-downtime rotation.
- `IMAGE_TRANSFORM_PUBLIC_SECRET`: long-lived HMAC secret for stable `/p/*` URLs. Rotating it invalidates every public transform URL, so manage it separately from the expiring-URL secret.

The two active secrets must have different values; the Worker rejects public delivery when they match.
- `CACHE_TTL_SECONDS`: edge cache TTL, capped by the signed URL expiry.

## Deployment

1. Enable Cloudflare Images transformations for the account.
2. Update the production and preview bucket names in `wrangler.jsonc` if needed.
3. Configure the signing secret:

   ```bash
   pnpm dlx wrangler@latest secret put IMAGE_TRANSFORM_SECRET --config apps/transform-worker/wrangler.jsonc
   pnpm dlx wrangler@latest secret put IMAGE_TRANSFORM_PUBLIC_SECRET --config apps/transform-worker/wrangler.jsonc
   ```

4. Deploy the Worker Routes `cdn.uploadkit.dev/t/*` and `cdn.uploadkit.dev/p/*`.
   The existing R2 custom domain continues to serve every other path:

   ```bash
   pnpm --filter @uploadkitdev/transform-worker run deploy
   ```

5. Set the API service's `IMAGE_TRANSFORM_BASE_URL=https://cdn.uploadkit.dev`
   and use the exact same `IMAGE_TRANSFORM_SECRET` and
   `IMAGE_TRANSFORM_PUBLIC_SECRET` values.

## Secret rotation

1. Put the current secret in `IMAGE_TRANSFORM_SECRET_PREVIOUS` on the Worker.
2. Put the new secret in `IMAGE_TRANSFORM_SECRET` on the Worker and deploy.
3. Update the API's `IMAGE_TRANSFORM_SECRET` to the new value.
4. After 25 hours, delete `IMAGE_TRANSFORM_SECRET_PREVIOUS` and deploy again.

The overlap keeps previously issued URLs valid without extending their lifetime.

Do not include `IMAGE_TRANSFORM_PUBLIC_SECRET` in routine secret rotation. It is the stable identity of public transform URLs. Rotate it only for incident response and treat invalidation of existing `/p/*` URLs as an intentional breaking operation.

The public Worker accepts only signed URLs issued by `POST /api/v1/transforms/image`. The API issues those URLs exclusively for paid projects and files recorded in UploadKit Cloud.
