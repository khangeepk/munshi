export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireClient, handleClientError } from '@/lib/client-auth';

export async function GET() {
  try {
    const { tenantId, client } = await requireClient();

    const cases = await prisma.case.findMany({
      where: { tenantId, clientId: client.id, deletedAt: null },
      select: {
        id: true,
        caseTitle: true,
        caseNumber: true,
        courtName: true,
        caseType: true,
        status: true,
        priority: true,
        filingDate: true,
        nextHearingDate: true,
        oppositeParty: true,
        // NEVER include: internalNotes, assignedTo staff details
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ cases });
  } catch (e) {
    return handleClientError(e);
  }
}
