export const dynamic = 'force-dynamic';

// Designed and Developed by SQ Tech

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser, isAdmin } from '@/lib/auth-server';
import { unauthorized } from '@/lib/http-errors';

export async function GET(request: Request) {
  try {
    const u = await getAuthenticatedUser();
    if (!u) return unauthorized();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (!isAdmin(u.role as any)) {
      where.lawyer_id = u.id;
    }
    if (status) {
      where.case_status = status;
    }

    const cases = await prisma.case.findMany({
      where,
      include: { 
        lawyer: { select: { full_name: true, email: true } },
        client: true,
        billings: true,
        documents: true,
        history: true,
      },
      orderBy: { updated_at: 'desc' },
    });
    
    // Map the new schema to legacy UI expectation temporarily
    const mapped = cases.map((c: any) => ({
      ...c,
      status: c.case_status,
      caseFrom: c.client?.name || c.caseFrom,
      clientPhone: c.client?.phone || c.clientPhone,
      lawyerId: c.lawyer_id,
      payments: c.billings,
      lawyer: c.lawyer ? { name: c.lawyer.full_name, email: c.lawyer.email } : null
    }));
    
    return NextResponse.json(mapped, { status: 200 });
  } catch (error) {
    console.error('[GET /api/cases]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const u = await getAuthenticatedUser();
    if (!u) return unauthorized();

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

    // Upsert Client based on caseFrom name or email
    let client = await prisma.client.findFirst({
      where: { name: caseFrom }
    });
    
    if (!client) {
      client = await prisma.client.create({
        data: {
          name: caseFrom,
          phone: clientPhone || null,
          email: clientEmail || null,
          cnic_number: clientCnic || null,
          address: clientAddress || null,
        }
      });
    }

    const newCase = await prisma.case.create({
      data: {
        title,
        client_id: client.id,
        court_name: location,
        case_status: status || 'FILED',
        hearing_date: nextHearingDate ? new Date(nextHearingDate) : null,
        
        // Legacy compat fields
        caseType,
        caseFrom,
        caseAgainst,
        submissionDate: new Date(submissionDate),
        firNumber: firNumber || null,
        location,
        judgeName: judgeName || null,
        totalFee: totalFee != null ? parseFloat(totalFee) : null,
        pendingFeeDueDate: pendingFeeDueDate ? new Date(pendingFeeDueDate) : null,
        decision: decision || null,
        remarks: remarks || null,
        
        lawyer_id: u.id,
      },
    });

    if (feePaid && parseFloat(feePaid) > 0) {
      await prisma.billing.create({
        data: {
          amount: parseFloat(feePaid),
          date: paidDate ? new Date(paidDate) : new Date(),
          method: paymentMethod || 'Cash',
          slipUrl: slipUrl || null,
          case_id: newCase.id,
          status: 'paid'
        }
      });
    }

    revalidatePath('/cases');
    
    const responseCase = {
      ...newCase,
      status: newCase.case_status,
      payments: feePaid ? [{ amount: parseFloat(feePaid) }] : []
    };
    
    return NextResponse.json(responseCase, { status: 201 });
  } catch (error) {
    console.error('[POST /api/cases]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
