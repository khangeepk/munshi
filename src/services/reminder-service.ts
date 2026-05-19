/**
 * reminder-service.ts
 * Manages HearingReminder lifecycle:
 *  - scheduleHearingReminder()  → create/update reminder 1 day before hearing
 *  - cancelHearingReminder()    → mark reminder as CANCELLED
 *  - processDueHearingReminders() → mark PENDING reminders due now as SENT
 */
import prisma from '@/lib/prisma';
import type { Hearing } from '@prisma/client';

/**
 * Schedules (or reschedules) a reminder 1 day before the hearing date.
 * Idempotent — if a reminder already exists for this hearingId, it is updated.
 */
export async function scheduleHearingReminder(hearing: Hearing): Promise<void> {
  // Calculate scheduled time: 1 day before hearing at 09:00 local (stored as UTC)
  const reminderDate = new Date(hearing.hearingDate);
  reminderDate.setDate(reminderDate.getDate() - 1);
  reminderDate.setHours(9, 0, 0, 0);

  const message = `Reminder: You have a hearing scheduled for ${hearing.hearingDate.toLocaleDateString(
    'en-PK',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  )} at ${hearing.courtName}. Purpose: ${hearing.purpose}.`;

  // Check if a reminder already exists for this hearing
  const existing = await prisma.hearingReminder.findFirst({
    where: { hearingId: hearing.id, status: { in: ['PENDING', 'SENT'] } },
  });

  if (existing) {
    // Reschedule if date changed
    await prisma.hearingReminder.update({
      where: { id: existing.id },
      data: {
        scheduledFor: reminderDate,
        status: 'PENDING',
        message,
        sentAt: null,
        failedAt: null,
        failureReason: null,
      },
    });
  } else {
    await prisma.hearingReminder.create({
      data: {
        tenantId: hearing.tenantId,
        caseId: hearing.caseId,
        hearingId: hearing.id,
        scheduledFor: reminderDate,
        channel: 'IN_APP',
        status: 'PENDING',
        message,
      },
    });
  }
}

/**
 * Cancels all PENDING reminders for a given hearing.
 */
export async function cancelHearingReminder(hearingId: string): Promise<void> {
  await prisma.hearingReminder.updateMany({
    where: { hearingId, status: 'PENDING' },
    data: { status: 'CANCELLED' },
  });
}

/**
 * Processes all reminders that are due (scheduledFor <= now).
 * Currently marks them as SENT (in-app). Future: trigger email/SMS/WhatsApp.
 * Returns the count of reminders processed.
 */
export async function processDueHearingReminders(): Promise<number> {
  const now = new Date();

  const dueReminders = await prisma.hearingReminder.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: { lte: now },
    },
    include: {
      tenant: { select: { name: true } },
      client: { select: { name: true, phone: true } },
      case: { select: { caseTitle: true } },
    },
  });

  let processedCount = 0;
  for (const reminder of dueReminders) {
    try {
      // Future: send email/SMS/WhatsApp here using reminder.channel
      // For now, mark as SENT (in-app notification recorded in DB)
      await prisma.hearingReminder.update({
        where: { id: reminder.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
      console.log(
        `[ReminderService] SENT reminder ${reminder.id} for case "${reminder.case?.caseTitle}" to client "${reminder.client?.name}"`
      );
      processedCount++;
    } catch (err) {
      await prisma.hearingReminder.update({
        where: { id: reminder.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: err instanceof Error ? err.message : 'Unknown error',
        },
      });
    }
  }

  return processedCount;
}
