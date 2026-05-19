import prisma from '../src/lib/prisma';

async function main() {
  try {
    const caseCount = await prisma.case.count();
    const userCount = await prisma.user.count();
    const tenantCount = await prisma.tenant.count();
    console.log('✅ DB CONNECTED');
    console.log(`   Cases: ${caseCount}`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Tenants: ${tenantCount}`);
    
    // Show first few cases
    const cases = await prisma.case.findMany({ take: 5, orderBy: { updatedAt: 'desc' }, select: { caseTitle: true, caseNumber: true, tenantId: true, status: true } });
    console.log('\n   Recent cases:');
    cases.forEach((c: any) => console.log(`   - ${c.caseNumber}: ${c.caseTitle} [${c.status}] tenantId=${c.tenantId}`));
  } catch(e: any) {
    console.error('❌ DB FAIL:', e.message);
  }
}

main();
