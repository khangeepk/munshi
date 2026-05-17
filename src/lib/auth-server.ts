
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import {
  SESSION_COOKIE,
  verifySessionToken,
  type SessionPayload,
  type SessionRole,
} from '@/lib/session-token';

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return verifySessionToken(raw);
}

/** Loads fresh user row; returns null if session invalid or user removed. */
export async function getAuthenticatedUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.profile.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      full_name: true,
      role: true,
      avatarUrl: true,
    },
  });
  if (user) {
    // Map back for legacy compatibility
    (user as any).name = user.full_name;
  }
  return user;
}

export function isAdmin(role: SessionRole | string): boolean {
  return role === 'ADMIN';
}

/** Only administrators may modify or delete persisted case/hearing records. */
export function canModifyRecords(role: SessionRole | string): boolean {
  return role === 'ADMIN';
}
