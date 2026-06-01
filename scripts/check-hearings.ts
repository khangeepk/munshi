import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const caseIds = [
  // Group 1
  'ea885e02-1ad0-44d9-be3c-f195e2a95812',
  '1a0ad63d-3ae6-4220-878c-7226aedaace6',
  'dd22b0a5-3904-40d7-b3a7-02235a7dfce8',
  // Group 2
  'caca99f8-e6fb-44ac-a621-64022786fe12',
  '01cb6cd0-67de-43cc-ac5f-60f36725a6c8',
];

async function main() {
  try {
    console.log('Fetching hearings for target cases...');
    const hearings = await prisma.hearing.findMany({
      where: {
        caseId: { in: caseIds },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`Found ${hearings.length} hearings:\n`);
    for (const h of hearings) {
      console.log(`Hearing ID: ${h.id}`);
      console.log(`  Case ID: ${h.caseId}`);
      console.log(`  Hearing Date: ${h.hearingDate.toISOString()}`);
      console.log(`  Purpose: ${h.purpose}`);
      console.log(`  Court Name: ${h.courtName}`);
      console.log(`  Created At: ${h.createdAt.toISOString()}`);
      console.log('------------------------------------');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
