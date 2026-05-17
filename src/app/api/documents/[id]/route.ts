export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser, canModifyRecords } from '@/lib/auth-server';
import { forbidden, unauthorized } from '@/lib/http-errors';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const u = await getAuthenticatedUser();
    if (!u) return unauthorized();
    if (!canModifyRecords(u.role)) return forbidden();

    const { id } = await context.params;

    const target = await prisma.document.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('[DELETE /api/documents/[id]]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
