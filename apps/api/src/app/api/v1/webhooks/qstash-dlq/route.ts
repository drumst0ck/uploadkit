import { type NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { connectDB, File } from '@uploadkit/db';

export const runtime = 'nodejs';

// POST /api/v1/webhooks/qstash-dlq — QStash dead-letter queue callback (D-10)
//
// Called by QStash when all retries for a webhook delivery are exhausted.
// Records the failure on the File record so the dashboard can surface it.
//
// NOT protected by withApiKey — authenticated via Upstash-Signature HMAC
// verification (T-03-22). Only sets webhookFailedAt timestamp — no destructive
// action possible (T-03-23).
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();

  // T-03-22: Verify QStash HMAC signature to confirm request is genuinely from QStash.
  // Skip verification in dev environments where signing keys are not configured.
  const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (currentKey && nextKey) {
    const receiver = new Receiver({
      currentSigningKey: currentKey,
      nextSigningKey: nextKey,
    });

    const signature = req.headers.get('upstash-signature') ?? '';
    const isValid = await receiver.verify({ signature, body }).catch(() => false);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else {
    console.warn(
      '[qstash-dlq] QSTASH signing keys not configured — skipping signature verification (dev mode)',
    );
  }

  // Parse the original webhook payload QStash was trying to deliver
  let payload: { file?: { id?: string }; projectId?: string };
  try {
    payload = JSON.parse(body) as { file?: { id?: string }; projectId?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // T-03-23: fileId validated before DB update — only sets a timestamp, no destructive action
  const fileId = payload?.file?.id;

  if (fileId) {
    await connectDB();
    await File.findByIdAndUpdate(fileId, {
      $set: { webhookFailedAt: new Date() },
    });
  }

  console.error('[qstash-dlq] Webhook delivery exhausted for file:', fileId);

  // Return 200 to acknowledge the DLQ callback — QStash expects a 2xx
  return NextResponse.json({ ok: true });
}
