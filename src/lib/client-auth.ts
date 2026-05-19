import prisma from '@/lib/prisma';
import { withTenant } from '@/lib/auth-server';
import { NextResponse } from 'next/server';

export type ClientPortalContext = {
  user: NonNullable<Awaited<ReturnType<typeof withTenant>>>['user'];
  tenantId: string;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    whatsapp: string | null;
    address: string | null;
    city: string | null;
    cnic: string | null;
    fatherName: string | null;
    tenantId: string;
    userId: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
};

/**
 * Validates that the request is from an active CLIENT user
 * with a linked Client profile. Throws safe errors otherwise.
 */
export async function requireClient(): Promise<ClientPortalContext> {
  const { user, tenantId } = await withTenant();

  if (user.role !== 'CLIENT') {
    throw Object.assign(new Error('Forbidden: CLIENT role required'), { status: 403 });
  }

  if (!tenantId) {
    throw Object.assign(new Error('Forbidden: no tenant'), { status: 403 });
  }

  // Find the Client profile linked to this user
  const client = await prisma.client.findFirst({
    where: { userId: user.id, tenantId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      whatsapp: true,
      address: true,
      city: true,
      cnic: true,
      fatherName: true,
      tenantId: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!client) {
    throw Object.assign(new Error('Forbidden: no client profile linked to this account'), { status: 403 });
  }

  return { user, tenantId, client };
}

/** Convenience alias */
export async function getClientPortalContext() {
  return requireClient();
}

/** Returns just the Client record, or null */
export async function getCurrentClient() {
  try {
    const ctx = await requireClient();
    return ctx.client;
  } catch {
    return null;
  }
}

/**
 * Asserts that a given caseId belongs to this client within this tenant.
 * Returns the case or throws 404.
 */
export async function assertClientOwnsCase(
  clientId: string,
  caseId: string,
  tenantId: string,
) {
  const c = await prisma.case.findFirst({
    where: { id: caseId, clientId, tenantId, deletedAt: null },
  });
  if (!c) {
    throw Object.assign(new Error('Case not found'), { status: 404 });
  }
  return c;
}

/**
 * Asserts a document is visible to the client:
 * - Belongs to their tenant
 * - Is not private (isPrivate = false)
 * - Their clientId OR the case belongs to them
 */
export async function assertClientCanViewDocument(
  clientId: string,
  docId: string,
  tenantId: string,
) {
  const doc = await prisma.document.findFirst({
    where: {
      id: docId,
      tenantId,
      isPrivate: false,
      deletedAt: null,
      OR: [
        { clientId },
        { case: { clientId } },
      ],
    },
  });
  if (!doc) {
    throw Object.assign(new Error('Document not found'), { status: 404 });
  }
  return doc;
}

/**
 * Asserts an invoice belongs to this client in this tenant.
 */
export async function assertClientCanViewInvoice(
  clientId: string,
  invoiceId: string,
  tenantId: string,
) {
  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, clientId, tenantId, deletedAt: null },
  });
  if (!inv) {
    throw Object.assign(new Error('Invoice not found'), { status: 404 });
  }
  return inv;
}

/** Helper to create a safe 403 response without leaking detail */
export function clientForbidden(msg = 'Access denied') {
  return NextResponse.json({ error: msg }, { status: 403 });
}

/** Helper to handle errors from requireClient */
export function handleClientError(e: unknown) {
  const err = e as { status?: number; message?: string };
  const status = err?.status ?? 500;
  const safe = status === 403 ? 'Forbidden' : status === 404 ? 'Not found' : 'Internal server error';
  if (status === 500) console.error('[Client Portal]', e);
  return NextResponse.json({ error: safe }, { status });
}
