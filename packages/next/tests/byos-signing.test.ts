import { expect, it } from 'vitest';
import { createByosClient, generateByosPresignedUrl } from '../src/byos';

it('cryptographically binds content-type and content-length in a BYOS PUT URL', async () => {
  const client = createByosClient({ region: 'us-east-1', bucket: 'test-bucket', accessKeyId: 'test-id', secretAccessKey: 'test-secret' });
  const url = new URL(await generateByosPresignedUrl(client, { bucket: 'test-bucket', key: 'media/file', contentType: 'image/png', contentLength: 10 }));
  const signedHeaders = url.searchParams.get('X-Amz-SignedHeaders')!.split(';');
  expect(signedHeaders).toContain('content-length');
  expect(signedHeaders).toContain('content-type');
  client.destroy();
});
