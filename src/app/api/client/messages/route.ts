export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireClient, handleClientError } from '@/lib/client-auth';

export async function GET() {
  try {
    const { user, tenantId, client } = await requireClient();

    // Get messages where this client is the sender or receiver
    const messages = await prisma.message.findMany({
      where: {
        clientId: client.id,
        OR: [
          { senderId: user.id },
          { receiverId: user.id },
        ],
      },
      select: {
        id: true,
        content: true,
        isRead: true,
        createdAt: true,
        senderId: true,
        case: { select: { id: true, caseTitle: true, caseNumber: true } },
        sender: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ messages });
  } catch (e) {
    return handleClientError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { user, tenantId, client } = await requireClient();

    const body = await req.json();
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    const caseId = typeof body?.caseId === 'string' ? body.caseId : null;

    if (!content || content.length < 2) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // If caseId provided, verify ownership
    if (caseId) {
      const caseRecord = await prisma.case.findFirst({
        where: { id: caseId, clientId: client.id, tenantId, deletedAt: null },
      });
      if (!caseRecord) {
        return NextResponse.json({ error: 'Case not found' }, { status: 404 });
      }
    }

    // Find the assigned advocate or any TENANT_ADMIN to receive the message
    const receiver = await prisma.user.findFirst({
      where: {
        tenantId,
        role: { in: ['TENANT_ADMIN', 'TENANT_USER'] },
        deletedAt: null,
        ...(caseId
          ? { assignedCases: { some: { id: caseId } } }
          : {}),
      },
      orderBy: { role: 'asc' }, // TENANT_ADMIN before TENANT_USER
    });

    if (!receiver) {
      return NextResponse.json({ error: 'No available recipient found' }, { status: 422 });
    }

    const message = await prisma.message.create({
      data: {
        clientId: client.id,
        caseId: caseId ?? undefined,
        senderId: user.id,
        receiverId: receiver.id,
        content,
      },
      select: {
        id: true,
        content: true,
        isRead: true,
        createdAt: true,
        senderId: true,
        sender: { select: { name: true, role: true } },
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (e) {
    return handleClientError(e);
  }
}
