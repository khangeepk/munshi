export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireClient, handleClientError } from '@/lib/client-auth';

export async function GET() {
  try {
    const { client } = await requireClient();
    // Return safe client profile fields only
    return NextResponse.json({ profile: client });
  } catch (e) {
    return handleClientError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const { client } = await requireClient();

    const body = await req.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : null;
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : null;
    const whatsapp = typeof body?.whatsapp === 'string' ? body.whatsapp.trim() : null;
    const address = typeof body?.address === 'string' ? body.address.trim() : null;
    const city = typeof body?.city === 'string' ? body.city.trim() : null;

    if (name !== null && name.length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
    }

    const data: Record<string, string> = {};
    if (name) data.name = name;
    if (phone) data.phone = phone;
    if (whatsapp !== null) data.whatsapp = whatsapp;
    if (address !== null) data.address = address;
    if (city !== null) data.city = city;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await prisma.client.update({
      where: { id: client.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        whatsapp: true,
        address: true,
        city: true,
        cnic: true,
        fatherName: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ profile: updated });
  } catch (e) {
    return handleClientError(e);
  }
}
