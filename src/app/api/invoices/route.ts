export const dynamic = 'force-dynamic';

// Designed and Developed by SQ Tech

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { unauthorized } from '@/lib/http-errors';

// POST /api/invoices  — generate invoice data (frontend renders to PDF)
export async function POST(request: Request) {
  try {
    const u = await getAuthenticatedUser();
    if (!u) return unauthorized();

    const body = await request.json();
    const { case_id } = body;

    if (!case_id) return NextResponse.json({ error: 'case_id required' }, { status: 400 });

    const caseData = await prisma.case.findUnique({
      where: { id: case_id },
      include: {
        client: true,
        lawyer: { select: { full_name: true, email: true } },
        billings: { orderBy: { date: 'asc' } },
        billableHours: { where: { is_billed: false }, orderBy: { start_time: 'asc' } },
      },
    });

    if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    const totalBilled = caseData.billings.reduce((s: number, b: any) => s + b.amount, 0);
    const totalHourlyFee = caseData.billableHours.reduce((s: number, h: any) => {
      const hrs = (h.duration_mins ?? 0) / 60;
      return s + hrs * h.hourly_rate;
    }, 0);
    const grandTotal = totalBilled + totalHourlyFee;

    const invoice = {
      branding: {
        firm: 'SQ Tech Legal Solutions',
        tagline: 'Designed and Developed by SQ Tech',
        generatedAt: new Date().toISOString(),
      },
      invoice_no: `INV-${Date.now().toString().slice(-8)}`,
      case: {
        id: caseData.id,
        title: caseData.title,
        status: caseData.case_status,
        court: caseData.court_name,
        filed: caseData.submissionDate,
      },
      client: {
        name: caseData.client?.name,
        email: caseData.client?.email,
        phone: caseData.client?.phone,
        cnic: caseData.client?.cnic_number,
      },
      lawyer: caseData.lawyer,
      billings: caseData.billings,
      billableHours: caseData.billableHours.map((h: any) => ({
        ...h,
        hours: ((h.duration_mins ?? 0) / 60).toFixed(2),
        fee: (((h.duration_mins ?? 0) / 60) * h.hourly_rate).toFixed(2),
      })),
      summary: {
        totalBillings: totalBilled,
        totalHourlyFee: totalHourlyFee.toFixed(2),
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
  const u = await getAuthenticatedUser();
  if (!u) return unauthorized();

  const { searchParams } = new URL(request.url);
  const case_id = searchParams.get('case_id');
  if (!case_id) return NextResponse.json({ error: 'case_id required' }, { status: 400 });

  const req = new Request(request.url, { method: 'POST', body: JSON.stringify({ case_id }), headers: { 'Content-Type': 'application/json' } });
  return POST(req);
}
