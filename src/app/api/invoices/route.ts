export const dynamic = 'force-dynamic';

// Designed and Developed by SQ Tech

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withTenant } from '@/lib/auth-server';
import { unauthorized } from '@/lib/http-errors';

// POST /api/invoices  — generate invoice data (frontend renders to PDF)
export async function POST(request: Request) {
  try {
    let tenantId;
    try {
      const res = await withTenant();
      tenantId = res.tenantId;
    } catch (e) {
      return unauthorized();
    }

    const body = await request.json();
    const { case_id } = body;

    if (!case_id) return NextResponse.json({ error: 'case_id required' }, { status: 400 });

    const whereClause: any = { id: case_id, deletedAt: null };
    if (tenantId) whereClause.tenantId = tenantId;

    const caseData = await prisma.case.findFirst({
      where: whereClause,
      include: {
        client: true,
        assignedTo: { select: { name: true, email: true } },
        invoices: { include: { payments: true } },
      },
    });

    if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    const payments = caseData.invoices.flatMap((inv: any) => inv.payments);
    const totalBilled = payments.reduce((s: number, p: any) => s + p.amount, 0);
    const grandTotal = totalBilled; // Since billableHours were dropped in new schema

    const invoice = {
      branding: {
        firm: 'SaaS Legal Platform',
        tagline: 'Professional Case Management',
        generatedAt: new Date().toISOString(),
      },
      invoice_no: `INV-${Date.now().toString().slice(-8)}`,
      case: {
        id: caseData.id,
        title: caseData.caseTitle,
        status: caseData.status,
        court: caseData.courtName,
        filed: caseData.filingDate,
      },
      client: {
        name: caseData.client?.name,
        email: caseData.client?.email,
        phone: caseData.client?.phone,
        cnic: caseData.client?.cnic,
      },
      lawyer: caseData.assignedTo,
      billings: payments.map((p: any) => ({
        ...p,
        date: p.paidAt,
      })),
      billableHours: [], // Deprecated in SaaS schema
      summary: {
        totalBillings: totalBilled,
        totalHourlyFee: "0.00",
        grandTotal: grandTotal.toFixed(2),
        currency: 'PKR',
      },
    };

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('[POST /api/invoices]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/invoices?case_id=xxx — preview
export async function GET(request: Request) {
  try {
    await withTenant();
  } catch (e) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const case_id = searchParams.get('case_id');
  if (!case_id) return NextResponse.json({ error: 'case_id required' }, { status: 400 });

  const req = new Request(request.url, { method: 'POST', body: JSON.stringify({ case_id }), headers: { 'Content-Type': 'application/json' } });
  return POST(req);
}
