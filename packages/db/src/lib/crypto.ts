import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LENGTH);
}

/**
 * Encrypts a UTF-8 string with AES-256-GCM. Returns base64 payload: salt + iv + tag + ciphertext.
 * Requires ENCRYPTION_KEY env var (32+ chars recommended).
 */
export function encryptSecret(plaintext: string, encryptionKey?: string): string {
  const keyMaterial = encryptionKey ?? process.env.ENCRYPTION_KEY;
  if (!keyMaterial || keyMaterial.length < 16) {
    throw new Error('[crypto] ENCRYPTION_KEY must be set (min 16 chars) to store BYOS credentials');
  }

  const salt = randomBytes(16);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(keyMaterial, salt);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
}

/** Decrypts a payload produced by encryptSecret. */
export function decryptSecret(payload: string, encryptionKey?: string): string {
  const keyMaterial = encryptionKey ?? process.env.ENCRYPTION_KEY;
  if (!keyMaterial || keyMaterial.length < 16) {
    throw new Error('[crypto] ENCRYPTION_KEY must be set to decrypt BYOS credentials');
  }

  const data = Buffer.from(payload, 'base64');
  const salt = data.subarray(0, 16);
  const iv = data.subarray(16, 16 + IV_LENGTH);
  const tag = data.subarray(16 + IV_LENGTH, 16 + IV_LENGTH + TAG_LENGTH);
  const encrypted = data.subarray(16 + IV_LENGTH + TAG_LENGTH);
  const key = deriveKey(keyMaterial, salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
