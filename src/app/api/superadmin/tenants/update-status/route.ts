import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { forbidden, unauthorized } from '@/lib/http-errors';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();
    if (user.role !== 'SUPER_ADMIN') return forbidden();

    const body = await request.json();
    const { tenantId, status } = body;

    if (!tenantId || !status) {
      return NextResponse.json({ error: 'Missing tenantId or status' }, { status: 400 });
    }

    const validStatuses = ['Active', 'Paused', 'Blocked'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be Active, Paused, or Blocked' }, { status: 400 });
    }

    // Update the Tenant status
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      tenantId: tenant.id,
      status: tenant.status,
    }, { status: 200 });
  } catch (error: any) {
    console.error('[POST /api/superadmin/tenants/update-status]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
