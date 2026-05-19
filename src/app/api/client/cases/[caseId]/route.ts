export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireClient, assertClientOwnsCase, handleClientError } from '@/lib/client-auth';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ caseId: string }> },
) {
  try {
    const { tenantId, client } = await requireClient();
    const { caseId } = await ctx.params;

    // Verify ownership first
    await assertClientOwnsCase(client.id, caseId, tenantId);

    // Fetch full case detail — explicitly strip private fields
    const caseData = await prisma.case.findFirst({
      where: { id: caseId, tenantId, clientId: client.id, deletedAt: null },
      select: {
        id: true,
        caseTitle: true,
        caseNumber: true,
        firNumber: true,
        courtName: true,
        judgeName: true,
        caseType: true,
        status: true,
        priority: true,
        filingDate: true,
        nextHearingDate: true,
        oppositeParty: true,
        oppositeCounsel: true,
        policeStation: true,
        legalSections: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        closedAt: true,
        // NEVER: internalNotes, assignedTo (staff-private)
        hearings: {
          where: { deletedAt: null },
          select: {
            id: true,
            hearingDate: true,
            hearingTime: true,
            courtName: true,
            purpose: true,
            status: true,
            orderSummary: true,
            nextHearingDate: true,
            // NEVER: remarks (internal staff notes)
          },
          orderBy: { hearingDate: 'desc' },
        },
        documents: {
          where: { isPrivate: false, deletedAt: null },
          select: {
            id: true,
            title: true,
            type: true,
            mimeType: true,
            size: true,
            createdAt: true,
            // NEVER: fileUrl (raw storage path), fileKey
          },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          where: { deletedAt: null },
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            totalAmount: true,
            paidAmount: true,
            status: true,
            dueDate: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!caseData) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ case: caseData });
  } catch (e) {
    return handleClientError(e);
  }
}
