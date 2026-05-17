export const dynamic = 'force-dynamic';

// Designed and Developed by SQ Tech

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser, isAdmin } from '@/lib/auth-server';
import { unauthorized, forbidden } from '@/lib/http-errors';

// GET /api/commission?associate_id=xxx  — list commissions
export async function GET(request: Request) {
  try {
    const u = await getAuthenticatedUser();
    if (!u) return unauthorized();

    const { searchParams } = new URL(request.url);
    const associateId = searchParams.get('associate_id');

    const where: any = isAdmin(u.role) ? {} : { associate_id: u.id };
    if (associateId && isAdmin(u.role)) where.associate_id = associateId;

    const commissions = await prisma.associateCommission.findMany({
      where,
      include: {
        case: { select: { title: true, case_status: true } },
        associate: { select: { full_name: true, email: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const totalPending = commissions.filter((c: any) => c.status === 'PENDING').reduce((s: number, c: any) => s + c.commission_amt, 0);
    const totalPaid = commissions.filter((c: any) => c.status === 'PAID').reduce((s: number, c: any) => s + c.commission_amt, 0);

    return NextResponse.json({ commissions, totalPending, totalPaid });
  } catch (error) {
    console.error('[GET /api/commission]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/commission  — create or approve commission
export async function POST(request: Request) {
  try {
    const u = await getAuthenticatedUser();
    if (!u) return unauthorized();

    const body = await request.json();
    const { action, case_id, associate_id, milestone, commission_pct, base_amount, notes, commission_id } = body;

    if (action === 'create') {
      if (!isAdmin(u.role)) return forbidden();
      if (!case_id || !associate_id || !milestone || !base_amount) {
        return NextResponse.json({ error: 'case_id, associate_id, milestone, and base_amount are required' }, { status: 400 });
      }
      const pct = commission_pct ?? 10;
      const commission_amt = (parseFloat(base_amount) * pct) / 100;

      const commission = await prisma.associateCommission.create({
        data: {
          case_id,
          associate_id,
          milestone,
          commission_pct: pct,
          base_amount: parseFloat(base_amount),
          commission_amt,
          notes: notes ?? null,
        },
      });
      return NextResponse.json(commission, { status: 201 });
    }

    if (action === 'approve' || action === 'mark_paid') {
      if (!isAdmin(u.role)) return forbidden();
      if (!commission_id) return NextResponse.json({ error: 'commission_id required' }, { status: 400 });

      const updated = await prisma.associateCommission.update({
        where: { id: commission_id },
        data: {
          status: action === 'approve' ? 'APPROVED' : 'PAID',
          paid_at: action === 'mark_paid' ? new Date() : undefined,
        },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[POST /api/commission]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
