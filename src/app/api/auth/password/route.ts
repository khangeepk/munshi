export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, hashPassword } from '@/lib/password';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { unauthorized } from '@/lib/http-errors';

export async function PATCH(request: Request) {
  try {
    const sessionUser = await getAuthenticatedUser();
    if (!sessionUser) return unauthorized();

    const body = await request.json();
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new password required' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }

    const full = await prisma.profile.findUnique({ where: { id: sessionUser.id } });
    if (!full?.passwordHash) {
      return NextResponse.json({ error: 'Password not set for this account' }, { status: 400 });
    }
    if (!verifyPassword(currentPassword, full.passwordHash)) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    await prisma.profile.update({
      where: { id: full.id },
      data: { passwordHash: hashPassword(newPassword) },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('[PATCH /api/auth/password]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
