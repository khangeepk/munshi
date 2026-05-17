export const dynamic = 'force-dynamic';

// Designed and Developed by Sikandar Hayat Baba

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { unauthorized } from '@/lib/http-errors';

export async function GET() {
  try {
    const u = await getAuthenticatedUser();
    if (!u) return unauthorized();

    const clients = await prisma.client.findMany({
      orderBy: { updated_at: 'desc' },
      include: { cases: true }
    });

    return NextResponse.json(clients, { status: 200 });
  } catch (error) {
    console.error('[GET /api/clients]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const u = await getAuthenticatedUser();
    if (!u) return unauthorized();

    const body = await request.json();
    const { name, email, phone, cnic_number, address } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const newClient = await prisma.client.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        cnic_number: cnic_number || null,
        address: address || null,
      },
    });

    return NextResponse.json(newClient, { status: 201 });
  } catch (error) {
    console.error('[POST /api/clients]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
