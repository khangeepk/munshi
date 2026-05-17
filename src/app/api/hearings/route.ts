export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser, isAdmin } from '@/lib/auth-server';
import { unauthorized } from '@/lib/http-errors';

const COURT_LABEL: Record<string, string> = {
  ISLAMABAD: 'Islamabad High Court',
  RAWALPINDI: 'Rawalpindi District Court',
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function calendarDayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export interface HearingPayload {
  id: string;
  caseId: string;
  caseTitle: string;
  hearingAt: string;
  court: string;
  judge: string | null;
  clientPhone: string | null;
  mode: 'agenda' | 'outcome';
  detail: string;
}

export async function GET() {
  try {
    const u = await getAuthenticatedUser();
    if (!u) return unauthorized();

    const today = startOfToday();

    const caseWhere: Prisma.CaseWhereInput = {
      OR: [
        { hearing_date: { not: null } },
        { nextHearingDate: { not: null } },
      ],
    };
    if (!isAdmin(u.role)) {
      caseWhere.lawyer_id = u.id;
    }

    const cases = await prisma.case.findMany({
      where: caseWhere,
      select: {
        id: true,
        title: true,
        location: true,
        judgeName: true,
        hearing_date: true,
        nextHearingDate: true,
        clientPhone: true,
        decision: true,
        remarks: true,
        caseFrom: true,
        caseAgainst: true,
        client: { select: { name: true, phone: true } },
      },
    });

    type Row = HearingPayload;

    const upcoming: Row[] = [];
    const scheduledPast: Row[] = [];

    for (const c of cases) {
      // Use hearing_date (new schema) OR nextHearingDate (migrated legacy data)
      const rawDate = (c as any).hearing_date ?? (c as any).nextHearingDate;
      if (!rawDate) continue;
      const dt = rawDate instanceof Date ? rawDate : new Date(rawDate as string);
      if (isNaN(dt.getTime())) continue;

      const phone = c.client?.phone || c.clientPhone || null;
      const courtLabel = COURT_LABEL[c.location] ?? c.location;

      if (dt >= today) {
        upcoming.push({
          id: `case-up-${c.id}`,
          caseId: c.id,
          caseTitle: c.title,
          hearingAt: dt.toISOString(),
          court: courtLabel,
          judge: c.judgeName ?? null,
          clientPhone: phone,
          mode: 'agenda',
          detail: c.remarks?.trim() || 'No agenda noted for this listing yet.',
        });
      } else {
        scheduledPast.push({
          id: `case-past-${c.id}-${calendarDayKey(dt.toISOString())}`,
          caseId: c.id,
          caseTitle: c.title,
          hearingAt: dt.toISOString(),
          court: courtLabel,
          judge: c.judgeName ?? null,
          clientPhone: phone,
          mode: 'outcome',
          detail: c.decision?.trim() || c.remarks?.trim() || 'No recorded outcome for this listing.',
        });
      }
    }

    upcoming.sort((a, b) => new Date(a.hearingAt).getTime() - new Date(b.hearingAt).getTime());

    const activityWhere: Prisma.ActivityWhereInput = { date: { lt: today } };
    if (!isAdmin(u.role)) activityWhere.case = { lawyer_id: u.id };

    const activities = await prisma.activity.findMany({
      where: activityWhere,
      include: {
        case: {
          select: {
            id: true, title: true, location: true, judgeName: true, clientPhone: true,
            client: { select: { phone: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
      take: 400,
    });

    const hearingActivities = activities.filter((a: any) =>
      /hearing/i.test(`${a.title} ${a.description ?? ''}`)
    );

    const activityPast: Row[] = hearingActivities.map((a: any) => ({
      id: `act-${a.id}`,
      caseId: a.caseId,
      caseTitle: a.case.title,
      hearingAt: a.date.toISOString(),
      court: COURT_LABEL[a.case.location] ?? a.case.location,
      judge: a.case.judgeName ?? null,
      clientPhone: a.case.client?.phone || a.case.clientPhone || null,
      mode: 'outcome' as const,
      detail: (a.description?.trim() ? `${a.title} — ${a.description.trim()}` : a.title.trim()) || 'Hearing milestone recorded.',
    }));

    const activityDayKeys = new Set(activityPast.map((q) => `${q.caseId}|${calendarDayKey(q.hearingAt)}`));
    const scheduledPastDeduped = scheduledPast.filter(
      (row) => !activityDayKeys.has(`${row.caseId}|${calendarDayKey(row.hearingAt)}`)
    );

    const pastMerged = [...activityPast, ...scheduledPastDeduped];
    pastMerged.sort((a, b) => new Date(b.hearingAt).getTime() - new Date(a.hearingAt).getTime());

    return NextResponse.json({ upcoming, past: pastMerged, serverNow: new Date().toISOString() }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/hearings]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
