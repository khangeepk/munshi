import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const caseIdsToCheck = [
  // Group 1
  '751cf480-f9f3-4b80-ab15-6288d037c8af',
  '948febc8-504d-43b4-8e82-55c0ce63fc63',
  'ea885e02-1ad0-44d9-be3c-f195e2a95812',
  '1a0ad63d-3ae6-4220-878c-7226aedaace6',
  'dd22b0a5-3904-40d7-b3a7-02235a7dfce8',
  // Group 2
  'caca99f8-e6fb-44ac-a621-64022786fe12',
  '01cb6cd0-67de-43cc-ac5f-60f36725a6c8',
  'd0a5f1d0-269d-414e-910d-6d36b158b46a',
  // Group 3
  '62721689-d973-48c0-97de-4657776f83ef',
  '0d007901-99b0-413b-984e-d82f06521117',
  '0da33f91-49b6-4523-9c13-6df059a1d894',
  // Group 4
  'a2d28d8a-9557-4756-989b-3ed7bd4bda86',
  '407007d5-f14a-41a9-93c7-d7cecf7ba148',
  'b8e1ab0c-ba7b-4d0d-b96d-da0a2504a318',
  '2f054166-46be-4795-92bb-dd4430469653',
  'ba911107-c2f3-4dc9-bada-d740237ff322',
];

async function main() {
  try {
    console.log('Checking related entities for all target cases...\n');
    for (const id of caseIdsToCheck) {
      const c = await prisma.case.findUnique({
        where: { id },
        select: {
          caseTitle: true,
          caseNumber: true,
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

      if (!c) {
        console.log(`ID ${id}: Case not found`);
        continue;
      }

      const totalCounts = Object.values(c._count).reduce((a, b) => a + b, 0);
      if (totalCounts > 0) {
        console.log(`Case "${c.caseTitle}" (${c.caseNumber}) ID: ${id}`);
        console.log(`  Related items:`, c._count);
      } else {
        console.log(`Case "${c.caseTitle}" (${c.caseNumber}) ID: ${id} - No related items`);
      }
    }
  } catch (error) {
    console.error('Error checking related:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
