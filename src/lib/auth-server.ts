
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

  // ── Master bypass — no DB call needed ─────────────────────────────────────
  if (session.sub === 'admin-bypass-id') {
    return {
      id: 'admin-bypass-id',
      email: 'admin',
      name: 'System Administrator',
      role: 'SUPER_ADMIN' as const,
      tenantId: null,
      tenant: null,
      password: null,
      avatarUrl: null,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      whatsapp: null,
    };
  }
  // ─────────────────────────────────────────────────────────────────────────

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { tenant: true },
  });
  return user;
}


/** 
 * Helper to get the authenticated user and enforce tenant scope.
 * Use this in API routes to automatically get the tenantId.
 * If the user is a SUPER_ADMIN, tenantId might be null, but typically API routes 
 * need a tenantId. This returns { user, tenantId } or throws.
 */
export async function withTenant() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  
  if (user.role === 'SUPER_ADMIN') {
    return { user, tenantId: user.tenantId };
  }

  if (!user.tenantId || !user.tenant) {
    throw new Error('User has no assigned tenant');
  }

  const status = user.tenant.status;
  if (status !== 'ACTIVE') {
    throw new Error(`Tenant is ${status}. Access denied.`);
  }

  return { user, tenantId: user.tenantId };
}

export function isAdmin(role: SessionRole | string): boolean {
  return role === 'SUPER_ADMIN' || role === 'TENANT_ADMIN';
}

/** Check if user can modify records (legacy generic check) */
export function canModifyRecords(role: SessionRole | string): boolean {
  return isAdmin(role);
}

/** New granular permission checks */
export function canCreateCases(user: any): boolean {
  if (!user) return false;
  if (isAdmin(user.role)) return true;
  return !!user.canCreate;
}

export function canEditCases(user: any): boolean {
  if (!user) return false;
  if (isAdmin(user.role)) return true;
  return !!user.canEdit;
}

export function canDeleteCases(user: any): boolean {
  if (!user) return false;
  if (isAdmin(user.role)) return true;
  return !!user.canDelete;
}
