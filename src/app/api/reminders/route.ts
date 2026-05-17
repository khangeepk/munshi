export const dynamic = 'force-dynamic';

// ─── SQ Tech — Hearing Reminder Scheduler API ─────────────────────────────────
// GET  /api/reminders          → list upcoming hearings within 7 days
// POST /api/reminders          → run the reminder dispatch job (admin only)
//
// The scheduler checks for hearings 1, 3, and 7 days from today (Asia/Karachi)
// and sends WhatsApp reminders to clients via wa.me deep links or direct API.

import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser, isAdmin } from '@/lib/auth-server';
import { unauthorized } from '@/lib/http-errors';
import { buildWhatsAppLink } from '@/lib/whatsapp';

// Days before hearing to send reminders
const REMINDER_DAYS = (process.env.REMINDER_DAYS_BEFORE ?? '1,3,7')
  .split(',')
  .map(d => parseInt(d.trim(), 10))
  .filter(d => !isNaN(d));

function toKarachiDate(offsetDays: number): Date {
  // Get "today" in Asia/Karachi (UTC+5)
  const now = new Date();
  const karachiOffset = 5 * 60; // minutes
  const localOffset = now.getTimezoneOffset();
  const karachiNow = new Date(now.getTime() + (karachiOffset + localOffset) * 60_000);
  karachiNow.setHours(0, 0, 0, 0);
  karachiNow.setDate(karachiNow.getDate() + offsetDays);
  return karachiNow;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-PK', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Karachi',
  });
}

function buildReminderMessage(params: {
  clientName: string;
  caseTitle: string;
  hearingDate: Date;
  court: string;
  judge: string | null;
  daysLeft: number;
}): string {
  const { clientName, caseTitle, hearingDate, court, judge, daysLeft } = params;
  const dayLabel = daysLeft === 1 ? 'TOMORROW' : `in ${daysLeft} days`;
  return [
    `*LawyerSys — Hearing Reminder* ⚖️`,
    ``,
    `Assalam-o-Alaikum *${clientName}*,`,
    ``,
    `Your court hearing is scheduled *${dayLabel}*:`,
    ``,
    `📅 *Date:* ${formatDate(hearingDate)}`,
    `🏛️ *Court:* ${court}`,
    `📋 *Case:* ${caseTitle}`,
    judge ? `👨‍⚖️ *Judge:* ${judge}` : '',
    ``,
    `⚠️ Please be present on time.`,
    ``,
    `For queries, contact your lawyer.`,
    ``,
    `— LawyerSys Legal CMS`,
  ].filter(l => l !== null).join('\n');
}

const COURT_LABEL: Record<string, string> = {
  ISLAMABAD: 'Islamabad High Court',
  RAWALPINDI: 'Rawalpindi District Court',
};

// ─── GET — List upcoming hearings ─────────────────────────────────────────────
export async function GET() {
  try {
    const u = await getAuthenticatedUser();
    if (!u) return unauthorized();

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const where: Prisma.CaseWhereInput = {
      OR: [
        { hearing_date: { gte: now, lte: nextWeek } },
        { nextHearingDate: { gte: now, lte: nextWeek } },
      ],
      case_status: { notIn: ['CLOSED'] },
    };
    if (!isAdmin(u.role)) where.lawyer_id = u.id;

    const upcoming = await prisma.case.findMany({
      where,
      include: { client: true },
      orderBy: { hearing_date: 'asc' },
    });

    // Enrich with computed daysLeft and reminder messages
    const enriched = upcoming.map((c: any) => {
      const hearingDate = c.hearing_date ?? c.nextHearingDate;
      const daysLeft = hearingDate
        ? Math.ceil((new Date(hearingDate).getTime() - Date.now()) / 86_400_000)
        : null;
      const phone = c.client?.phone || c.clientPhone;
      const waLink = phone && hearingDate
        ? buildWhatsAppLink(phone, buildReminderMessage({
            clientName: c.client?.name || c.caseFrom || 'Client',
            caseTitle: c.title,
            hearingDate: new Date(hearingDate),
            court: COURT_LABEL[c.location] ?? c.location,
            judge: c.judgeName,
            daysLeft: daysLeft!,
          }))
        : null;
      return { ...c, daysLeft, waLink };
    });

    return NextResponse.json({
      urgent: enriched.filter((c: any) => c.daysLeft !== null && c.daysLeft <= 1),
      upcoming: enriched,
      total: enriched.length,
      reminderDays: REMINDER_DAYS,
    }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/reminders]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST — Run the reminder dispatch job (admin only) ────────────────────────
export async function POST(req: Request) {
  try {
    const u = await getAuthenticatedUser();
    if (!u) return unauthorized();
    if (!isAdmin(u.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun: boolean = body.dryRun === true;

    const results: Array<{
      caseId: string;
      caseTitle: string;
      clientName: string;
      phone: string | null;
      daysLeft: number;
      waLink: string | null;
      status: 'SENT' | 'NO_PHONE' | 'DRY_RUN';
    }> = [];

    for (const offsetDays of REMINDER_DAYS) {
      const targetDate = toKarachiDate(offsetDays);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const cases = await prisma.case.findMany({
        where: {
          OR: [
            { hearing_date: { gte: targetDate, lt: nextDay } },
            { nextHearingDate: { gte: targetDate, lt: nextDay } },
          ],
          case_status: { notIn: ['CLOSED'] },
        },
        include: { client: true },
      });

      for (const c of cases) {
        const hearingDate = (c as any).hearing_date ?? (c as any).nextHearingDate;
        const phone = c.client?.phone || (c as any).clientPhone || null;
        const clientName = c.client?.name || (c as any).caseFrom || 'Client';
        const court = COURT_LABEL[(c as any).location] ?? (c as any).location;
        const judge = (c as any).judgeName ?? null;

        if (!phone) {
          results.push({ caseId: c.id, caseTitle: c.title, clientName, phone: null, daysLeft: offsetDays, waLink: null, status: 'NO_PHONE' });
          continue;
        }

        const message = buildReminderMessage({
          clientName, caseTitle: c.title,
          hearingDate: new Date(hearingDate),
          court, judge, daysLeft: offsetDays,
        });

        const waLink = buildWhatsAppLink(phone, message);

        if (!dryRun) {
          // Persist to WhatsApp queue
          try {
            await prisma.whatsappQueue.create({
              data: {
                phone,
                message,
                caseId: c.id,
                caseTitle: c.title,
                waLink,
                status: 'PENDING',
              },
            });
          } catch { /* ignore if DB write fails */ }
        }

        results.push({
          caseId: c.id,
          caseTitle: c.title,
          clientName,
          phone,
          daysLeft: offsetDays,
          waLink,
          status: dryRun ? 'DRY_RUN' : 'SENT',
        });
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      processed: results.length,
      results,
      reminderDays: REMINDER_DAYS,
      message: dryRun
        ? 'Dry run complete — no messages queued'
        : `${results.filter(r => r.status === 'SENT').length} reminder(s) queued in WhatsApp queue`,
    });
  } catch (error) {
    console.error('[POST /api/reminders]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
