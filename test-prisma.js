// Direct Prisma test — same as the API route
const path = require('path');
const { PrismaBetterSqlite3 } = require('./node_modules/@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('./node_modules/@prisma/client');

const DB_PATH = `file:${path.resolve(process.cwd(), 'dev.db')}`;
console.log('Testing Prisma at:', DB_PATH);

const adapter = new PrismaBetterSqlite3({ url: DB_PATH });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Test 1: Simple case query without includes
  console.log('\n--- Test 1: Simple cases (no include) ---');
  try {
    const cases = await prisma.case.findMany({ take: 2 });
    console.log('✅ Got', cases.length, 'cases (no include)');
    if (cases[0]) console.log('First case title:', cases[0].title);
  } catch(e) {
    console.error('❌ Simple case query failed:', e.message);
  }

  // Test 2: Cases with client include
  console.log('\n--- Test 2: Cases with client include ---');
  try {
    const cases = await prisma.case.findMany({ 
      take: 2,
      include: { client: true }
    });
    console.log('✅ Got', cases.length, 'cases (with client)');
  } catch(e) {
    console.error('❌ Cases with client failed:', e.message);
  }

  // Test 3: Cases with lawyer include
  console.log('\n--- Test 3: Cases with lawyer include ---');
  try {
    const cases = await prisma.case.findMany({ 
      take: 2,
      include: { lawyer: { select: { full_name: true, email: true } } }
    });
    console.log('✅ Got', cases.length, 'cases (with lawyer)');
  } catch(e) {
    console.error('❌ Cases with lawyer failed:', e.message);
  }

  // Test 4: Full include (same as cases API)
  console.log('\n--- Test 4: Full include (same as API) ---');
  try {
    const cases = await prisma.case.findMany({ 
      take: 2,
      include: { 
        lawyer: { select: { full_name: true, email: true } },
        client: true,
        billings: true,
        documents: true,
        history: true,
      }
    });
    console.log('✅ Got', cases.length, 'cases (full include)');
    console.log('First case:', cases[0]?.title, '| client:', cases[0]?.client?.name);
  } catch(e) {
    console.error('❌ Full include failed:', e.message);
    console.error(e.stack);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error('Fatal:', e.message); prisma.$disconnect(); });
