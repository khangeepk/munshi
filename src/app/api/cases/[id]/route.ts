import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { canEditCases, canDeleteCases, withTenant } from '@/lib/auth-server';
import { forbidden, unauthorized } from '@/lib/http-errors';
import { writeAuditLog } from '@/lib/audit';

// ─── GET /api/cases/:id ──────────────────────────────────────────────────────
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    let tenantId;
    try {
      const res = await withTenant();
      tenantId = res.tenantId;
    } catch (e) {
      return unauthorized();
    }

    const { id } = await context.params;
    
    const whereClause: Prisma.CaseWhereInput = { id, deletedAt: null };
    if (tenantId) whereClause.tenantId = tenantId;

    const caseData = await prisma.case.findFirst({
      where: whereClause,
      include: {
        assignedTo: { select: { name: true, email: true } },
        client:     true,
        documents:  { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
        invoices:   { orderBy: { createdAt: 'desc' }, include: { payments: true } },
        hearings:   { orderBy: { hearingDate: 'desc' } },
      },
    });

    if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    // Map to legacy shape so the existing UI doesn't break
    const mapped = {
      ...caseData,
      title: caseData.caseTitle,
      status: caseData.status,
      caseFrom: caseData.client?.name || '',
      caseAgainst: caseData.oppositeParty,
      lawyerId: caseData.assignedToId,
      lawyer: caseData.assignedTo ? { name: caseData.assignedTo.name, email: caseData.assignedTo.email } : null,
      payments: caseData.invoices.flatMap((inv: any) => inv.payments),
      location: caseData.courtName,
      submissionDate: caseData.filingDate,
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
    let user, tenantId;
    try {
      const res = await withTenant();
      user = res.user;
      tenantId = res.tenantId;
    } catch (e) {
      return unauthorized();
    }

    if (!canEditCases(user)) return forbidden();

    const { id } = await context.params;
    
    const whereClause: Prisma.CaseWhereInput = { id, deletedAt: null };
    if (tenantId) whereClause.tenantId = tenantId;

    const existing = await prisma.case.findFirst({ where: whereClause });
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

    await prisma.case.updateMany({
      where: whereClause,
      data: {
        caseTitle:        title,
        caseType,
        oppositeParty:    caseAgainst,
        filingDate:       new Date(submissionDate),
        firNumber:        firNumber        || null,
        courtName:        location,
        judgeName:        judgeName        || null,
        nextHearingDate:  nextHearingDate  ? new Date(nextHearingDate) : null,
        status:           status           || 'FILED',
      },
    });

    // Also update the linked client's phone/name if it changed
    if ((clientPhone || caseFrom) && existing.clientId) {
      await prisma.client.updateMany({
        where: { id: existing.clientId, tenantId: existing.tenantId },
        data: { 
          phone: clientPhone || undefined,
          name: caseFrom || undefined
        },
      }).catch(() => {/* non-critical, ignore */});
    }

    if (feePaid && parseFloat(feePaid) > 0) {
      // Create a dummy invoice if none exists, or just attach to case
      let invoice = await prisma.invoice.findFirst({
        where: { caseId: id, tenantId: existing.tenantId }
      });
      if (!invoice) {
        invoice = await prisma.invoice.create({
          data: {
            tenantId: existing.tenantId,
            clientId: existing.clientId,
            caseId: id,
            invoiceNumber: `INV-${Date.now()}`,
            amount: parseFloat(feePaid),
            totalAmount: parseFloat(feePaid),
            status: 'PARTIAL'
          }
        });
      }
      
      await prisma.payment.create({
        data: {
          tenantId: existing.tenantId,
          clientId: existing.clientId,
          caseId: id,
          invoiceId: invoice.id,
          amount:   parseFloat(feePaid),
          paidAt:     paidDate ? new Date(paidDate) : new Date(),
          method:   paymentMethod || 'Cash',
          status:   'COMPLETED',
        },
      });
    }

    await writeAuditLog({
      tenantId: existing.tenantId,
      userId: user.id,
      action: 'UPDATE',
      entityType: 'Case',
      entityId: existing.id,
      oldValues: existing,
      newValues: { title, status },
    });

    revalidatePath(`/cases/${id}`);
    revalidatePath('/cases');

    // Fetch fresh to return
    const updatedCase = await prisma.case.findFirst({ where: whereClause });

    const response = {
      ...updatedCase,
      status: updatedCase?.status,
      lawyerId: updatedCase?.assignedToId,
      title: updatedCase?.caseTitle,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('[PATCH /api/cases/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE /api/cases/:id ───────────────────────────────────────────────────
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    let user, tenantId;
    try {
      const res = await withTenant();
      user = res.user;
      tenantId = res.tenantId;
    } catch (e) {
      return unauthorized();
    }
    
    if (!canDeleteCases(user)) return forbidden();

    const { id } = await context.params;

    const whereClause: Prisma.CaseWhereInput = { id, deletedAt: null };
    if (tenantId) whereClause.tenantId = tenantId;

    const existing = await prisma.case.findFirst({ where: whereClause });
    if (!existing) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    const result = await prisma.case.updateMany({ 
      where: whereClause,
      data: { deletedAt: new Date() }
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    await writeAuditLog({
      tenantId: tenantId!,
      userId: user.id,
      action: 'DELETE',
      entityType: 'Case',
      entityId: id,
    });
    
    revalidatePath('/cases');
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[DELETE /api/cases/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
