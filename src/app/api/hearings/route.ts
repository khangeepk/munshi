import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { withTenant, isAdmin } from '@/lib/auth-server';
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
    let user, tenantId;
    try {
      const res = await withTenant();
      user = res.user;
      tenantId = res.tenantId;
    } catch (e) {
      return unauthorized();
    }

    const today = startOfToday();

    // In the new schema, hearings are stored in the `Hearing` model, but cases also have `nextHearingDate`
    // We can pull both, but ideally just `Hearing` records. Since legacy data migrated nextHearingDate to Cases,
    // we'll fetch Cases with nextHearingDate, AND Hearing records.

    const caseWhere: Prisma.CaseWhereInput = {
      nextHearingDate: { not: null },
    };
    if (tenantId) caseWhere.tenantId = tenantId;
    if (!isAdmin(user.role)) {
      caseWhere.assignedToId = user.id;
    }

    const cases = await prisma.case.findMany({
      where: caseWhere,
      select: {
        id: true,
        caseTitle: true,
        courtName: true,
        judgeName: true,
        nextHearingDate: true,
        client: { select: { name: true, phone: true } },
      },
    });

    const upcoming: HearingPayload[] = [];
    const scheduledPast: HearingPayload[] = [];

    for (const c of cases) {
      const rawDate = c.nextHearingDate;
      if (!rawDate) continue;
      const dt = rawDate instanceof Date ? rawDate : new Date(rawDate as string);
      if (isNaN(dt.getTime())) continue;

      const phone = c.client?.phone || null;
      const courtLabel = COURT_LABEL[c.courtName] ?? c.courtName;

      if (dt >= today) {
        upcoming.push({
          id: `case-up-${c.id}`,
          caseId: c.id,
          caseTitle: c.caseTitle,
          hearingAt: dt.toISOString(),
          court: courtLabel,
          judge: c.judgeName ?? null,
          clientPhone: phone,
          mode: 'agenda',
          detail: 'No agenda noted for this listing yet.',
        });
      } else {
        scheduledPast.push({
          id: `case-past-${c.id}-${calendarDayKey(dt.toISOString())}`,
          caseId: c.id,
          caseTitle: c.caseTitle,
          hearingAt: dt.toISOString(),
          court: courtLabel,
          judge: c.judgeName ?? null,
          clientPhone: phone,
          mode: 'outcome',
          detail: 'No recorded outcome for this listing.',
        });
      }
    }

    // Also fetch explicit Hearing records
    const hearingWhere: Prisma.HearingWhereInput = {};
    if (tenantId) hearingWhere.tenantId = tenantId;
    if (!isAdmin(user.role)) {
      hearingWhere.case = { assignedToId: user.id };
    }

    const hearings = await prisma.hearing.findMany({
      where: hearingWhere,
      include: {
        case: {
          select: {
            caseTitle: true,
            judgeName: true,
            client: { select: { phone: true } }
          }
        }
      }
    });

    for (const h of hearings) {
      const dt = h.hearingDate;
      if (isNaN(dt.getTime())) continue;

      const phone = h.case?.client?.phone || null;
      const courtLabel = COURT_LABEL[h.courtName] ?? h.courtName;

      if (dt >= today) {
        upcoming.push({
          id: `hearing-up-${h.id}`,
          caseId: h.caseId,
          caseTitle: h.case?.caseTitle || 'Unknown Case',
          hearingAt: dt.toISOString(),
          court: courtLabel,
          judge: h.case?.judgeName ?? null,
          clientPhone: phone,
          mode: 'agenda',
          detail: 'No purpose noted.',
        });
      } else {
        scheduledPast.push({
          id: `hearing-past-${h.id}-${calendarDayKey(dt.toISOString())}`,
          caseId: h.caseId,
          caseTitle: h.case?.caseTitle || 'Unknown Case',
          hearingAt: dt.toISOString(),
          court: courtLabel,
          judge: h.case?.judgeName ?? null,
          clientPhone: phone,
          mode: 'outcome',
          detail: h.orderSummary?.trim() || h.remarks?.trim() || 'No recorded outcome.',
        });
      }
    }

    upcoming.sort((a, b) => new Date(a.hearingAt).getTime() - new Date(b.hearingAt).getTime());
    
    // De-dupe past hearings to avoid clutter if a case and a hearing record match
    const pastMerged: HearingPayload[] = [];
    const pastKeys = new Set<string>();
    
    for (const p of scheduledPast) {
        const key = `${p.caseId}|${calendarDayKey(p.hearingAt)}`;
        if (!pastKeys.has(key)) {
            pastKeys.add(key);
            pastMerged.push(p);
        }
    }

    pastMerged.sort((a, b) => new Date(b.hearingAt).getTime() - new Date(a.hearingAt).getTime());

    return NextResponse.json({ upcoming, past: pastMerged, serverNow: new Date().toISOString() }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/hearings]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
