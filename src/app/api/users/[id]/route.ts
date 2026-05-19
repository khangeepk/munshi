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
    let currentUser, tenantId;
    try {
      const res = await withTenant();
      currentUser = res.user;
      tenantId = res.tenantId;
    } catch (e) {
      return unauthorized();
    }
    
    if (!isAdmin(currentUser.role)) return forbidden();

    const { id } = await context.params;
    if (id === currentUser.id) {
      return NextResponse.json({ error: 'You cannot delete your own account here' }, { status: 400 });
    }

    const whereClause: import('@prisma/client').Prisma.UserWhereInput = { id };
    if (tenantId) whereClause.tenantId = tenantId;

    const adminCount = await prisma.user.count({ where: { role: 'TENANT_ADMIN', tenantId: tenantId ?? undefined } });
    const target = await prisma.user.findFirst({ where: whereClause });
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (target.role === 'TENANT_ADMIN' && adminCount <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last administrator' }, { status: 400 });
    }

    await prisma.$transaction([
      // Reassign cases to the admin performing deletion
      prisma.case.updateMany({
        where: { assignedToId: id },
        data: { assignedToId: currentUser.id },
      }),
      // Reassign tasks
      prisma.task.updateMany({
        where: { assignedToId: id },
        data: { assignedToId: currentUser.id },
      }),
      // Delete the user safely inside transaction since we verified ownership via target check
      prisma.user.delete({ where: { id: target.id } }),
    ]);

    await writeAuditLog({
      tenantId: target.tenantId!,
      userId: currentUser.id,
      action: 'DELETE',
      entityType: 'User',
      entityId: id,
      oldValues: target,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('[DELETE /api/users/[id]]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
