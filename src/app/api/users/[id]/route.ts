export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser, isAdmin } from '@/lib/auth-server';
import { forbidden, unauthorized } from '@/lib/http-errors';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const u = await getAuthenticatedUser();
    if (!u) return unauthorized();
    if (!isAdmin(u.role)) return forbidden();

    const { id } = await context.params;
    if (id === u.id) {
      return NextResponse.json({ error: 'You cannot delete your own account here' }, { status: 400 });
    }

    const adminCount = await prisma.profile.count({ where: { role: 'ADMIN' } });
    const target = await prisma.profile.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (target.role === 'ADMIN' && adminCount <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last administrator' }, { status: 400 });
    }

    await prisma.$transaction([
      // Reassign cases to the admin performing deletion
      prisma.case.updateMany({
        where: { lawyer_id: id },
        data: { lawyer_id: u.id },
      }),
      // Reassign activities
      prisma.activity.updateMany({
        where: { userId: id },
        data: { userId: u.id },
      }),
      // Delete the profile
      prisma.profile.delete({ where: { id } }),
    ]);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('[DELETE /api/users/[id]]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
