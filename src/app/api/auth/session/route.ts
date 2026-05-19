export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth-server';
import { SESSION_COOKIE } from '@/lib/session-token';
import prisma from '@/lib/prisma';
import { unauthorized } from '@/lib/http-errors';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  if (session.sub === 'admin-bypass-id') {
    return NextResponse.json({
      user: {
        id: 'admin-bypass-id',
        email: 'admin',
        name: 'System Administrator',
        role: 'SUPER_ADMIN',
        tenantId: null,
      }
    }, { status: 200 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { tenant: true },
  });

  if (!user) {
    const jar = await cookies();
    jar.delete(SESSION_COOKIE);
    return unauthorized();
  }

  if (user.status === 'Blocked' || user.status === 'BLOCKED') {
    const jar = await cookies();
    jar.delete(SESSION_COOKIE);
    return NextResponse.json({ error: 'account_suspended' }, { status: 403 });
  }

  if (user.role !== 'SUPER_ADMIN' && user.tenantId && user.tenant) {
    const status = user.tenant.status;
    if (status === 'Blocked' || status === 'BLOCKED' || status === 'Paused' || status === 'PAUSED') {
      const jar = await cookies();
      jar.delete(SESSION_COOKIE);
      return NextResponse.json({ error: 'account_suspended' }, { status: 403 });
    }
  }

  return NextResponse.json({ user }, { status: 200 });
}
