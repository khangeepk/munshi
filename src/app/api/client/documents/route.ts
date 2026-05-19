export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireClient, handleClientError } from '@/lib/client-auth';

export async function GET() {
  try {
    const { tenantId, client } = await requireClient();

    const documents = await prisma.document.findMany({
      where: {
        tenantId,
        isPrivate: false,
        deletedAt: null,
        OR: [
          { clientId: client.id },
          { case: { clientId: client.id } },
        ],
      },
      select: {
        id: true,
        title: true,
        type: true,
        mimeType: true,
        size: true,
        createdAt: true,
        case: {
          select: { id: true, caseTitle: true, caseNumber: true },
        },
        // NEVER expose: fileUrl, fileKey, uploadedBy (staff info)
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ documents });
  } catch (e) {
    return handleClientError(e);
  }
}
