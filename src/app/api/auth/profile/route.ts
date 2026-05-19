export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withTenant } from '@/lib/auth-server';
import { unauthorized } from '@/lib/http-errors';
import { attachSessionCookie } from '@/lib/session-response';

export async function PATCH(request: Request) {
  try {
    let sessionUser;
    try {
      const res = await withTenant();
      sessionUser = res.user;
    } catch (e) {
      return unauthorized();
    }
    if (!sessionUser) return unauthorized();

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Valid display name required' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: sessionUser.id },
      data: { name: name },
      select: { id: true, email: true, name: true, role: true, tenantId: true },
    });

    const mappedUser = { ...updated, avatarUrl: null }; // avatarUrl was dropped from schema
    const res = NextResponse.json({ user: mappedUser }, { status: 200 });
    return attachSessionCookie(res, mappedUser);
  } catch (e) {
    console.error('[PATCH /api/auth/profile]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
