import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

// Guards the file-management routes (list/delete). These act with your server-side
// UploadKit API key, so they must never be reachable anonymously. Fails closed:
// with no configured token every request is rejected.
export function requireAdminToken(expected: string | undefined): RequestHandler {
  return (req, res, next) => {
    const header = req.headers.authorization ?? '';
    const provided = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
    if (expected && provided) {
      const a = Buffer.from(provided);
      const b = Buffer.from(expected);
      if (a.length === b.length && timingSafeEqual(a, b)) {
        next();
        return;
      }
    }
    res.status(401).json({ error: 'Unauthorized' });
  };
}
