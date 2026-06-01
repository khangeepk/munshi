import 'dotenv/config';
import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
});



const DRY_RUN = process.argv.includes('--execute') ? false : true;
const TIME_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

async function main() {
  console.log('='.repeat(60));
  console.log(`DATABASE DEDUPLICATION START (${DRY_RUN ? 'DRY-RUN MODE' : 'EXECUTE MODE'})`);
  console.log('='.repeat(60));

  try {
    // 1. Fetch all cases sorted by createdAt
    const cases = await prisma.case.findMany({
      include: {
        client: { select: { name: true } },
        tenant: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`Loaded ${cases.length} cases.`);

    // 2. Group by unique keys: tenantId + caseTitle + clientName
    const groups: Record<string, typeof cases> = {};
    for (const c of cases) {
      const clientName = c.client?.name || 'Unknown';
      const groupKey = `${c.tenantId}::${c.caseTitle.toLowerCase().trim()}::${clientName.toLowerCase().trim()}`;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(c);
    }

    const deduplicationTasks: { originalId: string; duplicateId: string; title: string; tenant: string }[] = [];

    // 3. Identify duplicates using a sliding time window (2 hours)
    for (const [groupKey, groupCases] of Object.entries(groups)) {
      if (groupCases.length <= 1) continue;

      let currentOriginal = groupCases[0];
      
      for (let i = 1; i < groupCases.length; i++) {
        const currentCase = groupCases[i];
        const timeDiff = Math.abs(currentCase.createdAt.getTime() - currentOriginal.createdAt.getTime());
        
        if (timeDiff <= TIME_WINDOW_MS) {
          // It's a duplicate of currentOriginal
          deduplicationTasks.push({
            originalId: currentOriginal.id,
            duplicateId: currentCase.id,
            title: currentCase.caseTitle,
            tenant: currentCase.tenant?.slug || 'unknown',
          });
        } else {
          // Not a duplicate, it becomes the new original candidate for subsequent entries
          currentOriginal = currentCase;
        }
      }
    }

    if (deduplicationTasks.length === 0) {
      console.log('No duplicate cases identified.');
      return;
    }

    console.log(`Identified ${deduplicationTasks.length} duplicate records to clean up.`);

    if (DRY_RUN) {
      console.log('\n--- DRY RUN ACTIONS (No changes made) ---');
      for (const task of deduplicationTasks) {
        console.log(`[DRY RUN] Delete Case ID ${task.duplicateId} (Tenant: ${task.tenant})`);
        console.log(`          Duplicate of Original Case ID ${task.originalId} ("${task.title}")`);
        
        // Count related items that would be moved
        const related = await prisma.case.findUnique({
          where: { id: task.duplicateId },
          select: {
            _count: {
              select: {
                hearings: true,
                documents: true,
                tasks: true,
                invoices: true,
                payments: true,
                messages: true,
                hearingReminders: true,
              },
            },
          },
        });
        console.log(`          Would move related items:`, related?._count);
      }
      console.log('\nDry run completed successfully. To execute, run with the --execute flag.');
    } else {
      console.log('\n--- EXECUTING DATABASE TRANSACTION ---');
      
      let processedCount = 0;
      
      // Perform deduplication inside a secure database transaction
      await prisma.$transaction(async (tx) => {

        for (const task of deduplicationTasks) {
          console.log(`\nDeduplicating case ID ${task.duplicateId} -> ${task.originalId}`);
          
          // Re-link related entities
          const hearings = await tx.hearing.updateMany({
            where: { caseId: task.duplicateId },
            data: { caseId: task.originalId },
          });
          if (hearings.count > 0) console.log(`  - Re-linked ${hearings.count} hearings`);

          const documents = await tx.document.updateMany({
            where: { caseId: task.duplicateId },
            data: { caseId: task.originalId },
          });
          if (documents.count > 0) console.log(`  - Re-linked ${documents.count} documents`);

          const tasks = await tx.task.updateMany({
            where: { caseId: task.duplicateId },
            data: { caseId: task.originalId },
          });
          if (tasks.count > 0) console.log(`  - Re-linked ${tasks.count} tasks`);

          const invoices = await tx.invoice.updateMany({
            where: { caseId: task.duplicateId },
            data: { caseId: task.originalId },
          });
          if (invoices.count > 0) console.log(`  - Re-linked ${invoices.count} invoices`);

          const payments = await tx.payment.updateMany({
            where: { caseId: task.duplicateId },
            data: { caseId: task.originalId },
          });
          if (payments.count > 0) console.log(`  - Re-linked ${payments.count} payments`);

          const messages = await tx.message.updateMany({
            where: { caseId: task.duplicateId },
            data: { caseId: task.originalId },
          });
          if (messages.count > 0) console.log(`  - Re-linked ${messages.count} messages`);

          const reminders = await tx.hearingReminder.updateMany({
            where: { caseId: task.duplicateId },
            data: { caseId: task.originalId },
          });
          if (reminders.count > 0) console.log(`  - Re-linked ${reminders.count} reminders`);

          // Delete the duplicate case
          await tx.case.delete({
            where: { id: task.duplicateId },
          });
          console.log(`  - Deleted duplicate Case ID ${task.duplicateId}`);
          processedCount++;
        }
      }, { timeout: 60000 });


      console.log(`\nSuccessfully deduplicated ${processedCount} cases in transaction.`);
    }

  } catch (error) {
    console.error('CRITICAL: Transaction rolled back due to error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
