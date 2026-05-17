export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser, isAdmin } from '@/lib/auth-server';
import { unauthorized } from '@/lib/http-errors';

/** GET /api/whatsapp/queue — list recent queue entries (admin only) */
export async function GET(req: Request) {
  try {
    const u = await getAuthenticatedUser();
    if (!u || !isAdmin(u.role)) return unauthorized();

    const { searchParams } = new URL(req.url);
    const limit  = Math.min(Number(searchParams.get('limit')  ?? 50), 100);
    const status = searchParams.get('status'); // optional filter

    const entries = await prisma.whatsappQueue.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(entries);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** PATCH /api/whatsapp/queue — bulk status update (admin only) */
export async function PATCH(req: Request) {
  try {
    const u = await getAuthenticatedUser();
    if (!u || !isAdmin(u.role)) return unauthorized();

    const { id, status } = await req.json();
    if (!id || !['SENT', 'CANCELLED', 'FAILED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid id or status' }, { status: 400 });
    }

    const updated = await prisma.whatsappQueue.update({
      where: { id },
      data: { status, sentAt: status === 'SENT' ? new Date() : undefined },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
