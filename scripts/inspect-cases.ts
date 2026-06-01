import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Fetching cases...');
    const cases = await prisma.case.findMany({
      include: {
        client: true,
        assignedTo: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`Cases in DB: ${cases.length}\n`);
    for (const c of cases) {
      console.log(`ID: ${c.id}`);
      console.log(`  Title: ${c.caseTitle}`);
      console.log(`  Client: ${c.client?.name}`);
      console.log(`  Assigned To (User): ${c.assignedTo?.name}`);
      console.log(`  Judge: ${c.judgeName}`);
      console.log(`  Status: ${c.status}`);
      console.log(`  Next Hearing Date: ${c.nextHearingDate}`);
      console.log(`  Location/Court: ${c.courtName}`);
      console.log(`  DeletedAt: ${c.deletedAt}`);
      console.log('------------------------------------');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
