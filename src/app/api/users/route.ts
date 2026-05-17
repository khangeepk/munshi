export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { getAuthenticatedUser, isAdmin } from '@/lib/auth-server';
import { forbidden, unauthorized } from '@/lib/http-errors';

export async function GET() {
  const u = await getAuthenticatedUser();
  if (!u) return unauthorized();
  if (!isAdmin(u.role)) return forbidden();

  const users = await prisma.profile.findMany({
    select: {
      id:        true,
      email:     true,
      full_name: true,
      role:      true,
      created_at: true,
    },
    orderBy: { created_at: 'asc' },
  });

  // Map to legacy shape expected by the UI
  const mapped = users.map((usr: typeof users[number]) => ({ ...usr, name: usr.full_name, createdAt: usr.created_at }));
  return NextResponse.json(mapped, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const u = await getAuthenticatedUser();
    if (!u) return unauthorized();
    if (!isAdmin(u.role)) return forbidden();

    const body = await request.json();
    const email    = typeof body.email    === 'string' ? body.email.trim()    : '';
    const name     = typeof body.name     === 'string' ? body.name.trim()     : '';
    const password = typeof body.password === 'string' ? body.password        : '';
    const role     = typeof body.role     === 'string' ? body.role.trim()     : 'DATA_ENTRY';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const created = await prisma.profile.create({
      data: {
        email,
        full_name:    name,
        role,
        passwordHash: hashPassword(password),
      },
      select: { id: true, email: true, full_name: true, role: true, created_at: true },
    });

    return NextResponse.json({ ...created, name: created.full_name, createdAt: created.created_at }, { status: 201 });
  } catch (e: unknown) {
    const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
    if (code === 'P2002') {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    console.error('[POST /api/users]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
