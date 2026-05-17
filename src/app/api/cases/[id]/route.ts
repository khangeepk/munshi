// Designed and Developed by SQ Tech
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { canModifyRecords, getAuthenticatedUser, isAdmin } from '@/lib/auth-server';
import { forbidden, unauthorized } from '@/lib/http-errors';

// ─── GET /api/cases/:id ──────────────────────────────────────────────────────
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const u = await getAuthenticatedUser();
    if (!u) return unauthorized();

    const { id } = await context.params;
    const caseData = await prisma.case.findUnique({
      where: { id },
      include: {
        lawyer:    { select: { full_name: true, email: true } },
        client:    true,
        documents: { orderBy: { upload_date: 'desc' } },
        history:   {
          orderBy: { date: 'desc' },
          include: { user: { select: { full_name: true } } },
        },
        billings:  { orderBy: { date: 'desc' } },
        billableHours: { orderBy: { start_time: 'desc' } },
      },
    });

    if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    if (!isAdmin(u.role) && caseData.lawyer_id !== u.id) return forbidden();

    // Map to legacy shape so the existing UI doesn't break
    const mapped = {
      ...caseData,
      status: caseData.case_status,
      lawyerId: caseData.lawyer_id,
      lawyer: caseData.lawyer ? { name: caseData.lawyer.full_name, email: caseData.lawyer.email } : null,
      payments: caseData.billings,
    };

    return NextResponse.json(mapped, { status: 200 });
  } catch (error) {
    console.error('[GET /api/cases/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PATCH /api/cases/:id ────────────────────────────────────────────────────
export async function PATCH(
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
    const {
      title, caseType, caseFrom, caseAgainst,
      submissionDate, firNumber, location,
      judgeName, nextHearingDate, clientPhone,
      totalFee, pendingFeeDueDate, decision, remarks, status,
      feePaid, paidDate, paymentMethod, slipUrl,
    } = body;

    if (!title || !caseType || !caseFrom || !caseAgainst || !submissionDate || !location) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const updatedCase = await prisma.case.update({
      where: { id },
      data: {
        title,
        caseType,
        caseFrom,
        caseAgainst,
        submissionDate:   new Date(submissionDate),
        firNumber:        firNumber        || null,
        location,
        court_name:       location,
        judgeName:        judgeName        || null,
        nextHearingDate:  nextHearingDate  ? new Date(nextHearingDate) : null,
        hearing_date:     nextHearingDate  ? new Date(nextHearingDate) : null,
        clientPhone:      clientPhone      || null,
        totalFee:         totalFee != null ? parseFloat(totalFee) : null,
        pendingFeeDueDate: pendingFeeDueDate ? new Date(pendingFeeDueDate) : null,
        decision:         decision         || null,
        remarks:          remarks          || null,
        case_status:      status           || 'FILED',
      },
    });

    // Also update the linked client's phone if it changed
    if (clientPhone && existing.client_id) {
      await prisma.client.update({
        where: { id: existing.client_id },
        data: { phone: clientPhone },
      }).catch(() => {/* non-critical, ignore */});
    }

    if (feePaid && parseFloat(feePaid) > 0) {
      await prisma.billing.create({
        data: {
          amount:   parseFloat(feePaid),
          date:     paidDate ? new Date(paidDate) : new Date(),
          method:   paymentMethod || 'Cash',
          slipUrl:  slipUrl || null,
          case_id:  id,
          status:   'paid',
        },
      });
    }

    revalidatePath(`/cases/${id}`);
    revalidatePath('/cases');

    const response = {
      ...updatedCase,
      status: updatedCase.case_status,
      lawyerId: updatedCase.lawyer_id,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('[PATCH /api/cases/:id]', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE /api/cases/:id ───────────────────────────────────────────────────
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const u = await getAuthenticatedUser();
    if (!u) return unauthorized();
    if (!canModifyRecords(u.role)) return forbidden();

    const { id } = await context.params;

    const existing = await prisma.case.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    await prisma.case.delete({ where: { id } });
    revalidatePath('/cases');
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[DELETE /api/cases/:id]', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
