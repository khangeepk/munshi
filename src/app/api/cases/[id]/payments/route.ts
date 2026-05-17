export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { canModifyRecords, getAuthenticatedUser } from '@/lib/auth-server';
import { forbidden, unauthorized } from '@/lib/http-errors';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const u = await getAuthenticatedUser();
    if (!u) return unauthorized();
    if (!canModifyRecords(u.role)) return forbidden();

    const { id } = await context.params;

    const existing = await prisma.case.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    const body = await request.json();
    const { amount, method, date } = body;

    if (!amount || !method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const billing = await prisma.billing.create({
      data: {
        amount:  parseFloat(amount),
        method,
        date:    date ? new Date(date) : new Date(),
        case_id: id,
        status:  'paid',
      },
    });

    revalidatePath(`/cases/${id}`);
    revalidatePath('/billing');

    return NextResponse.json(billing, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/cases/:id/payments]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
