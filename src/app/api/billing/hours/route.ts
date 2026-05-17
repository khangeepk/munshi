export const dynamic = 'force-dynamic';

// Designed and Developed by SQ Tech

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { unauthorized } from '@/lib/http-errors';

// GET /api/billing/hours?case_id=xxx  — list sessions
export async function GET(request: Request) {
  try {
    const u = await getAuthenticatedUser();
    if (!u) return unauthorized();

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('case_id');

    const hours = await prisma.billableHour.findMany({
      where: caseId ? { case_id: caseId } : {},
      include: { lawyer: { select: { full_name: true } }, case: { select: { title: true } } },
      orderBy: { start_time: 'desc' },
    });
    return NextResponse.json(hours);
  } catch (error) {
    console.error('[GET /api/billing/hours]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/billing/hours  — start or stop a session
export async function POST(request: Request) {
  try {
    const u = await getAuthenticatedUser();
    if (!u) return unauthorized();

    const body = await request.json();
    const { action, case_id, session_id, hourly_rate, notes } = body;

    if (action === 'start') {
      if (!case_id) return NextResponse.json({ error: 'case_id required' }, { status: 400 });
      const session = await prisma.billableHour.create({
        data: {
          case_id,
          lawyer_id: u.id,
          start_time: new Date(),
          hourly_rate: hourly_rate ?? 5000,
          notes: notes ?? null,
        },
      });
      return NextResponse.json(session, { status: 201 });
    }

    if (action === 'stop') {
      if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 });
      const existing = await prisma.billableHour.findUnique({ where: { id: session_id } });
      if (!existing) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

      const end = new Date();
      const duration_mins = Math.round((end.getTime() - existing.start_time.getTime()) / 60000);
      const updated = await prisma.billableHour.update({
        where: { id: session_id },
        data: { end_time: end, duration_mins, notes: notes ?? existing.notes },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action. Use "start" or "stop".' }, { status: 400 });
  } catch (error) {
    console.error('[POST /api/billing/hours]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
