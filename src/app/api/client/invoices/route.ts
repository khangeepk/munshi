export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireClient, handleClientError } from '@/lib/client-auth';

export async function GET() {
  try {
    const { tenantId, client } = await requireClient();

    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        clientId: client.id,
        deletedAt: null,
      },
      select: {
        id: true,
        invoiceNumber: true,
        amount: true,
        discount: true,
        tax: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
        dueDate: true,
        createdAt: true,
        case: { select: { id: true, caseTitle: true, caseNumber: true } },
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            reference: true,
            status: true,
            paidAt: true,
          },
          orderBy: { paidAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ invoices });
  } catch (e) {
    return handleClientError(e);
  }
}
