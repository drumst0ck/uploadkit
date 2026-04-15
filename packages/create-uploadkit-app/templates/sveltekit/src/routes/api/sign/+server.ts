import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface SignBody {
  filename: string;
  contentType: string;
}

function isSignBody(value: unknown): value is SignBody {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.filename === 'string' && typeof v.contentType === 'string';
}

/**
 * POST /api/sign
 *
 * Returns a presigned PUT URL for uploading a single file directly to
 * Cloudflare R2 (or any S3-compatible bucket).
 *
 * Body: `{ filename: string, contentType: string }`
 * Response: `{ url: string, key: string, method: 'PUT' }`
 *
 * Requires the following env vars in `.env.local`:
 *   - R2_ACCOUNT_ID
 *   - R2_ACCESS_KEY_ID
 *   - R2_SECRET_ACCESS_KEY
 *   - R2_BUCKET
 *
 * If any are missing the endpoint returns 503 with a configuration hint —
 * this keeps `pnpm dev` bootable on a fresh scaffold.
 */
export const POST: RequestHandler = async ({ request }) => {
  const raw = (await request.json().catch(() => null)) as unknown;
  if (!isSignBody(raw)) {
    return json({ error: 'Body must be { filename: string, contentType: string }' }, { status: 400 });
  }

  const accountId = env.R2_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const bucket = env.R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return json(
      {
        error:
          'Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET in .env.local',
      },
      { status: 503 },
    );
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const key = `${crypto.randomUUID()}-${raw.filename}`;

  // ContentType MUST be set on both sign AND the client PUT — mismatch → 403.
  const url = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: raw.contentType,
    }),
    { expiresIn: 60 * 5 },
  );

  return json({ url, key, method: 'PUT' as const });
};
