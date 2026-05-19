import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';

export interface AuditLogOptions {
  tenantId: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function writeAuditLog({
  tenantId,
  userId,
  action,
  entityType,
  entityId,
  oldValues,
  newValues,
  ipAddress,
  userAgent,
}: AuditLogOptions) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        entity: entityType,
        entityId,
        details: (oldValues || newValues) ? ({ oldValues, newValues } as Prisma.InputJsonValue) : Prisma.JsonNull,
        ipAddress,
      },
    });
  } catch (error) {
    console.error('[writeAuditLog] Failed to write audit log:', error);
    // We swallow the error so that a failed audit log doesn't crash the main operation,
    // though in a strict compliance environment, we might want to throw.
  }
}
