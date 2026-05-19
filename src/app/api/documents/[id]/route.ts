export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withTenant, isAdmin } from '@/lib/auth-server';
import { forbidden, unauthorized } from '@/lib/http-errors';
import { writeAuditLog } from '@/lib/audit';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    let user, tenantId;
    try {
      const res = await withTenant();
      user = res.user;
      tenantId = res.tenantId;
    } catch (e) {
      return unauthorized();
    }
    
    if (!isAdmin(user.role)) return forbidden();

    const { id } = await context.params;

    const whereClause: any = { id, deletedAt: null };
    if (tenantId) whereClause.tenantId = tenantId;

    const target = await prisma.document.findFirst({ where: whereClause });
    if (!target) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const result = await prisma.document.updateMany({ where: whereClause, data: { deletedAt: new Date() } });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    await writeAuditLog({
      tenantId: tenantId!,
      userId: user.id,
      action: 'DELETE',
      entityType: 'Document',
      entityId: id,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('[DELETE /api/documents/[id]]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
