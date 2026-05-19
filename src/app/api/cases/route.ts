import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { withTenant, canCreateCases } from '@/lib/auth-server';
import { forbidden, unauthorized } from '@/lib/http-errors';
import { writeAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    let tenantId;
    try {
      const res = await withTenant();
      tenantId = res.tenantId;
    } catch (e) {
      return unauthorized();
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;

    const cases = await prisma.case.findMany({
      where,
      include: { 
        assignedTo: { select: { name: true, email: true } },
        client: true,
        invoices: { include: { payments: true } },
        documents: true,
        hearings: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    
    // Map to legacy UI expectation temporarily
    const mapped = cases.map((c: any) => ({
      ...c,
      title: c.caseTitle,
      status: c.status,
      caseFrom: c.client?.name || '',
      caseAgainst: c.oppositeParty,
      clientPhone: c.client?.phone || '',
      lawyerId: c.assignedToId,
      payments: c.invoices.flatMap((inv: any) => inv.payments),
      lawyer: c.assignedTo ? { name: c.assignedTo.name, email: c.assignedTo.email } : null,
      submissionDate: c.filingDate,
      location: c.courtName,
      nextHearingDate: c.nextHearingDate,
    }));
    
    return NextResponse.json(mapped, { status: 200 });
  } catch (error) {
    console.error('[GET /api/cases]', error);
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
    
    if (!canCreateCases(user)) return forbidden();

    const body = await request.json();

    const {
      title, caseType, caseFrom, caseAgainst,
      submissionDate, firNumber, location,
      judgeName, nextHearingDate, clientPhone, clientEmail, clientCnic, clientAddress,
      totalFee, pendingFeeDueDate, decision, remarks, status,
      feePaid, paidDate, paymentMethod, slipUrl,
    } = body;

    if (!title || !caseType || !caseFrom || !caseAgainst || !submissionDate || !location) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Upsert Client based on caseFrom name and tenantId
    let client = await prisma.client.findFirst({
      where: { name: caseFrom, tenantId: tenantId! }
    });
    
    if (!client) {
      client = await prisma.client.create({
        data: {
          tenantId: tenantId!,
          name: caseFrom,
          phone: clientPhone || '',
          email: clientEmail || null,
          cnic: clientCnic || null,
          address: clientAddress || null,
        }
      });
    }

    const newCase = await prisma.case.create({
      data: {
        tenantId: tenantId!,
        caseTitle: title,
        caseNumber: `CASE-${Date.now()}`,
        clientId: client.id,
        courtName: location,
        status: status || 'FILED',
        nextHearingDate: nextHearingDate ? new Date(nextHearingDate) : null,
        caseType,
        oppositeParty: caseAgainst,
        filingDate: new Date(submissionDate),
        firNumber: firNumber || null,
        judgeName: judgeName || null,
        assignedToId: user.id,
      },
    });

    await writeAuditLog({
      tenantId: tenantId!,
      userId: user.id,
      action: 'CREATE',
      entityType: 'Case',
      entityId: newCase.id,
      newValues: { title },
    });

    if (totalFee != null) {
      const invoice = await prisma.invoice.create({
        data: {
          tenantId: tenantId!,
          clientId: client.id,
          caseId: newCase.id,
          invoiceNumber: `INV-${Date.now()}`,
          amount: parseFloat(totalFee),
          totalAmount: parseFloat(totalFee),
          status: 'DRAFT',
          dueDate: pendingFeeDueDate ? new Date(pendingFeeDueDate) : null,
        }
      });

      if (feePaid && parseFloat(feePaid) > 0) {
        await prisma.payment.create({
          data: {
            tenantId: tenantId!,
            clientId: client.id,
            caseId: newCase.id,
            invoiceId: invoice.id,
            amount: parseFloat(feePaid),
            method: paymentMethod || 'Cash',
            status: 'COMPLETED',
            paidAt: paidDate ? new Date(paidDate) : new Date(),
          }
        });
      }
    } else if (feePaid && parseFloat(feePaid) > 0) {
        await prisma.payment.create({
          data: {
            tenantId: tenantId!,
            clientId: client.id,
            caseId: newCase.id,
            amount: parseFloat(feePaid),
            method: paymentMethod || 'Cash',
            status: 'COMPLETED',
            paidAt: paidDate ? new Date(paidDate) : new Date(),
          }
        });
    }

    revalidatePath('/cases');
    
    const responseCase = {
      ...newCase,
      status: newCase.status,
      payments: feePaid ? [{ amount: parseFloat(feePaid) }] : []
    };
    
    return NextResponse.json(responseCase, { status: 201 });
  } catch (error) {
    console.error('[POST /api/cases]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
