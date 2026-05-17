export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { unauthorized } from '@/lib/http-errors';
import { attachSessionCookie } from '@/lib/session-response';

const MAX_AVATAR_CHARS = 1_250_000;

export async function PATCH(request: Request) {
  try {
    const sessionUser = await getAuthenticatedUser();
    if (!sessionUser) return unauthorized();

    const body = await request.json();
    const avatarUrl = typeof body?.avatarUrl === 'string' ? body.avatarUrl : null;
    if (avatarUrl != null && avatarUrl.length > MAX_AVATAR_CHARS) {
      return NextResponse.json({ error: 'Image too large' }, { status: 400 });
    }
    if (avatarUrl !== null && avatarUrl.trim() !== '' && !/^data:image\/[a-zA-Z+\-.]+;base64,/.test(avatarUrl)) {
      return NextResponse.json({ error: 'Use a Base64 image data URL or clear the field.' }, { status: 400 });
    }

    const updated = await prisma.profile.update({
      where: { id: sessionUser.id },
      data: {
        avatarUrl: avatarUrl && avatarUrl.trim() !== '' ? avatarUrl.trim() : null,
      },
      select: { id: true, email: true, full_name: true, role: true, avatarUrl: true },
    });

    const mappedUser = { ...updated, name: updated.full_name };
    const res = NextResponse.json({ user: mappedUser }, { status: 200 });
    return attachSessionCookie(res, mappedUser);
  } catch (e) {
    console.error('[PATCH /api/auth/avatar]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
