export const dynamic = 'force-dynamic';

// Designed and Developed by Sikandar Hayat Baba

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withTenant } from '@/lib/auth-server';
import { unauthorized } from '@/lib/http-errors';
import { writeAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    let tenantId;
    try {
      const res = await withTenant();
      tenantId = res.tenantId;
    } catch (e) {
      return unauthorized();
    }

    const whereClause: any = {};
    if (tenantId) whereClause.tenantId = tenantId;

    const clients = await prisma.client.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      include: { cases: true }
    });

    // Map legacy fields for UI compatibility
    const mapped = clients.map((c: any) => ({
      ...c,
      cnic_number: c.cnic,
    }));

    return NextResponse.json(mapped, { status: 200 });
  } catch (error) {
    console.error('[GET /api/clients]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let user, tenantId;
    try {
      const res = await withTenant();
      user = res.user;
      tenantId = res.tenantId;
    } catch (e) {
      return unauthorized();
    }

    const body = await request.json();
    const { name, email, phone, cnic_number, address } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const newClient = await prisma.client.create({
      data: {
        tenantId: tenantId!,
        name,
        email: email || null,
        phone: phone || '',
        cnic: cnic_number || null,
        address: address || null,
      },
    });

    await writeAuditLog({
      tenantId: tenantId!,
      userId: user.id,
      action: 'CREATE',
      entityType: 'Client',
      entityId: newClient.id,
      newValues: { name, email, phone },
    });

    return NextResponse.json({ ...newClient, cnic_number: newClient.cnic }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/clients]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
