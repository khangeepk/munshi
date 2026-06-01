import 'dotenv/config';
import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Auditing database for duplicate cases...');
    
    // Fetch all cases with client info
    const cases = await prisma.case.findMany({
      include: {
        client: {
          select: {
            name: true,
          },
        },
        tenant: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`Total cases found: ${cases.length}`);

    // Group by unique keys: tenantId + caseTitle + clientName
    const groups: Record<string, typeof cases> = {};
    for (const c of cases) {
      const clientName = c.client?.name || 'Unknown';
      const groupKey = `${c.tenantId}::${c.caseTitle.toLowerCase().trim()}::${clientName.toLowerCase().trim()}`;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(c);
    }

    let duplicateGroupCount = 0;
    let totalDuplicates = 0;

    console.log('\n=== DUPLICATE GROUPS FOUND ===');
    for (const [key, group] of Object.entries(groups)) {
      if (group.length > 1) {
        // Let's check timestamps to see if they are duplicates
        // The user says "matching Title, Client Name, and close/identical createdAt timestamps"
        // Let's show all cases in this group and calculate diff
        duplicateGroupCount++;
        console.log(`\nGroup: ${key}`);
        console.log(`Tenant: ${group[0].tenant?.name} (${group[0].tenant?.slug})`);
        console.log(`Client Name: ${group[0].client?.name}`);
        console.log(`Case Title: "${group[0].caseTitle}"`);
        
        group.forEach((c, index) => {
          const prev = index > 0 ? group[index - 1] : null;
          const timeDiffMin = prev 
            ? Math.round(Math.abs(c.createdAt.getTime() - prev.createdAt.getTime()) / 60000) 
            : 0;
          
          console.log(`  - [${index + 1}] ID: ${c.id}`);
          console.log(`    Case Number: ${c.caseNumber}`);
          console.log(`    Created At: ${c.createdAt.toISOString()}`);
          if (prev) {
            console.log(`    Diff from previous: ${timeDiffMin} mins`);
          }
        });
        totalDuplicates += (group.length - 1);
      }
    }

    console.log('\n======================================');
    console.log(`Total Duplicate Groups: ${duplicateGroupCount}`);
    console.log(`Total trailing duplicate records: ${totalDuplicates}`);

  } catch (error) {
    console.error('Error during audit:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
