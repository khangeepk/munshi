import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'ls_session';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  return process.env.AUTH_SECRET ?? 'dev-only-lawyersys-secret-change-in-production';
}

export function signSessionPayload(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;
  const expected = createHmac('sha256', getSecret()).update(body).digest('base64url');
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  const p = parsed as Partial<SessionPayload>;
  if (
    typeof p.sub !== 'string'
    || typeof p.email !== 'string'
    || typeof p.name !== 'string'
    || typeof p.role !== 'string'
    || typeof p.exp !== 'number'
  )
    return null;
  if (Date.now() > p.exp) return null;
  return {
    sub: p.sub,
    email: p.email,
    name: p.name,
    role: p.role as SessionPayload['role'],
    exp: p.exp,
  };
}

export type SessionRole = 'ADMIN' | 'DATA_ENTRY' | 'LAWYER' | 'PARALEGAL';

export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  role: SessionRole;
  exp: number;
}

export function buildSessionPayload(user: {
  id: string;
  email: string;
  name: string;
  role: SessionRole;
}): SessionPayload {
  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Date.now() + MAX_AGE_MS,
  };
}

export const SESSION_COOKIE = COOKIE_NAME;
