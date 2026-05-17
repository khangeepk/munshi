export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { unauthorized } from '@/lib/http-errors';
import { attachSessionCookie } from '@/lib/session-response';

export async function PATCH(request: Request) {
  try {
    const sessionUser = await getAuthenticatedUser();
    if (!sessionUser) return unauthorized();

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Valid display name required' }, { status: 400 });
    }

    const updated = await prisma.profile.update({
      where: { id: sessionUser.id },
      data: { full_name: name },
      select: { id: true, email: true, full_name: true, role: true, avatarUrl: true },
    });

    const mappedUser = { ...updated, name: updated.full_name };
    const res = NextResponse.json({ user: mappedUser }, { status: 200 });
    return attachSessionCookie(res, mappedUser);
  } catch (e) {
    console.error('[PATCH /api/auth/profile]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
