/**
 * scripts/test-hearing-reminders.ts
 *
 * Validates the full HearingReminder lifecycle:
 *  1. Creating a hearing schedules a reminder for D-1
 *  2. Updating hearing date reschedules the reminder
 *  3. Cancelling hearing cancels all reminders
 *  4. Reminder belongs to correct tenant/client/case
 *
 * Run: npx tsx scripts/test-hearing-reminders.ts
 */

import { PrismaClient } from '@prisma/client';
import {
  scheduleHearingReminder,
  cancelHearingReminder,
  processDueHearingReminders,
} from '../src/services/reminder-service';

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Hearing Reminder System — Test Suite                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // ─── Find Sami Khan tenant (must have been migrated first) ────────────────
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'sami-khan' } });
  if (!tenant) {
    console.error('❌ Sami Khan tenant not found. Run migrate-legacy-cases-to-sami-khan.ts first.');
    process.exit(1);
  }

  const advocate = await prisma.user.findFirst({ where: { email: 'sami.khan@test.com' } });
  if (!advocate) {
    console.error('❌ sami.khan@test.com not found.');
    process.exit(1);
  }

  // Get or create a test client
  let testClient = await prisma.client.findFirst({
    where: { tenantId: tenant.id, name: 'Test Reminder Client' },
  });
  if (!testClient) {
    testClient = await prisma.client.create({
      data: { tenantId: tenant.id, name: 'Test Reminder Client', phone: '0300000000' },
    });
  }

  // Get or create a test case
  let testCase = await prisma.case.findFirst({
    where: { tenantId: tenant.id, caseNumber: 'TEST-REMINDER-001' },
  });
  if (!testCase) {
    testCase = await prisma.case.create({
      data: {
        tenantId: tenant.id,
        clientId: testClient.id,
        assignedToId: advocate.id,
        caseTitle: 'Test Reminder Case',
        caseNumber: 'TEST-REMINDER-001',
        courtName: 'High Court Test',
        caseType: 'Test',
        oppositeParty: 'Test Party',
        status: 'FILED',
      },
    });
  }

  // ─── Test 1: Create hearing → reminder should be D-1 ─────────────────────
  console.log('Test 1: Hearing creation schedules D-1 reminder');
  const hearing1Date = new Date();
  hearing1Date.setDate(hearing1Date.getDate() + 7); // 7 days from now
  hearing1Date.setHours(10, 0, 0, 0);

  const hearing1 = await prisma.hearing.create({
    data: {
      tenantId: tenant.id,
      caseId: testCase.id,
      hearingDate: hearing1Date,
      courtName: 'High Court Test',
      purpose: 'Test purpose',
      status: 'SCHEDULED',
      createdById: advocate.id,
    },
  });

  await scheduleHearingReminder(hearing1);

  const reminder1 = await prisma.hearingReminder.findFirst({
    where: { hearingId: hearing1.id, status: 'PENDING' },
  });

  assert(!!reminder1, 'Reminder created for new hearing');
  if (reminder1) {
    const expectedDate = new Date(hearing1Date);
    expectedDate.setDate(expectedDate.getDate() - 1);
    const dayDiff = Math.round((reminder1.scheduledFor.getTime() - expectedDate.setHours(0, 0, 0, 0)) / 86400000);
    assert(
      Math.abs(dayDiff) < 1,
      `Reminder scheduled for D-1 (${reminder1.scheduledFor.toLocaleDateString('en-PK')})`
    );
    assert(reminder1.tenantId === tenant.id, 'Reminder belongs to correct tenant');
    assert(reminder1.caseId === testCase.id, 'Reminder belongs to correct case');
    assert(reminder1.status === 'PENDING', 'Reminder status is PENDING');
  }

  // ─── Test 2: Update hearing date → reminder should reschedule ─────────────
  console.log('\nTest 2: Updating hearing date reschedules reminder');
  const newHearingDate = new Date();
  newHearingDate.setDate(newHearingDate.getDate() + 14); // 14 days from now
  newHearingDate.setHours(10, 0, 0, 0);

  const updatedHearing = await prisma.hearing.update({
    where: { id: hearing1.id },
    data: { hearingDate: newHearingDate },
  });
  await scheduleHearingReminder(updatedHearing);

  const reminder2 = await prisma.hearingReminder.findFirst({
    where: { hearingId: hearing1.id, status: 'PENDING' },
  });

  assert(!!reminder2, 'Reminder still exists after date update');
  if (reminder2) {
    const expectedNewDate = new Date(newHearingDate);
    expectedNewDate.setDate(expectedNewDate.getDate() - 1);
    const reminderDay = reminder2.scheduledFor.getDate();
    const expectedDay = expectedNewDate.getDate();
    assert(reminderDay === expectedDay, `Reminder rescheduled to new D-1 (day ${reminderDay})`);
  }

  // ─── Test 3: Cancel hearing → reminder cancelled ───────────────────────────
  console.log('\nTest 3: Cancelling hearing cancels reminder');
  await cancelHearingReminder(hearing1.id);

  const cancelledReminder = await prisma.hearingReminder.findFirst({
    where: { hearingId: hearing1.id },
    orderBy: { updatedAt: 'desc' },
  });
  assert(cancelledReminder?.status === 'CANCELLED', 'Reminder marked as CANCELLED');

  // ─── Test 4: processDueHearingReminders processes overdue reminders ────────
  console.log('\nTest 4: processDueHearingReminders marks overdue reminders as SENT');
  // Create a past-due reminder directly
  const pastHearing = await prisma.hearing.create({
    data: {
      tenantId: tenant.id,
      caseId: testCase.id,
      hearingDate: new Date(Date.now() - 86400000 * 2), // 2 days ago
      courtName: 'Past Court',
      purpose: 'Past test',
      status: 'HEARD',
      createdById: advocate.id,
    },
  });
  await prisma.hearingReminder.create({
    data: {
      tenantId: tenant.id,
      caseId: testCase.id,
      hearingId: pastHearing.id,
      scheduledFor: new Date(Date.now() - 86400000), // 1 day ago = overdue
      channel: 'IN_APP',
      status: 'PENDING',
      message: 'Test overdue reminder',
    },
  });

  const processed = await processDueHearingReminders();
  assert(processed > 0, `processDueHearingReminders processed ${processed} overdue reminder(s)`);

  // Clean up test data
  await prisma.hearingReminder.deleteMany({ where: { caseId: testCase.id } });
  await prisma.hearing.deleteMany({ where: { caseId: testCase.id } });
  await prisma.case.delete({ where: { id: testCase.id } });
  await prisma.client.delete({ where: { id: testClient.id } });

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log(`║  Results: ${passed} passed, ${failed} failed                             ║`);
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  if (failed > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error('❌ Test suite failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
