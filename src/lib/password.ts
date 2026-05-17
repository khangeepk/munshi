import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

const ITERATIONS = 120_000;
const KEYLEN = 64;
const DIGEST = 'sha512';

/** Returns a storable string salt:iterations:hash (hex). */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(plain, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex');
  return `${salt}:${ITERATIONS}:${hash}`;
}

export function verifyPassword(plain: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const parts = stored.split(':');
  if (parts.length !== 3) return false;
  const [salt, iterStr, hash] = parts;
  const iterations = parseInt(iterStr, 10);
  if (!salt || !Number.isFinite(iterations) || !hash) return false;
  const derived = pbkdf2Sync(plain, salt, iterations, KEYLEN, DIGEST).toString('hex');
  try {
    return timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}
