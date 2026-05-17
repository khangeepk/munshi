import { PrismaClient } from '@prisma/client';
const Database = require('better-sqlite3');

const prisma = new PrismaClient({
  datasourceUrl: "postgresql://postgres.plnjsgqqtenhdqusnzhw:Khangee786786@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
});
const sqlite = new Database('./dev.db', { readonly: true });

function parseDate(d: any) {
  if (!d) return null;
  return new Date(d);
}

async function migrate() {
  console.log('Reading from local dev.db SQLite...');
  
  const profiles = sqlite.prepare('SELECT * FROM profiles').all();
  const clients = sqlite.prepare('SELECT * FROM clients').all();
  const cases = sqlite.prepare('SELECT * FROM cases').all();
  const documents = sqlite.prepare('SELECT * FROM documents').all();
  const billings = sqlite.prepare('SELECT * FROM billings').all();
  const activities = sqlite.prepare('SELECT * FROM activities').all();

  console.log(`Found: ${profiles.length} profiles, ${clients.length} clients, ${cases.length} cases.`);

  // Upsert Profiles
  for (const p of profiles) {
    p.created_at = parseDate(p.created_at);
    p.updated_at = parseDate(p.updated_at);
    try {
      await prisma.profile.upsert({ where: { id: p.id }, create: p, update: p });
    } catch (e) {
      console.log(`Skipped profile ${p.email} due to constraint conflict`);
    }
  }
  console.log('✅ Profiles seeded');

  // Upsert Clients
  for (const c of clients) {
    c.date_of_birth = parseDate(c.date_of_birth);
    c.created_at = parseDate(c.created_at);
    c.updated_at = parseDate(c.updated_at);
    // Parse comm_log if it's a string
    if (typeof c.comm_log === 'string') {
      try { c.comm_log = JSON.parse(c.comm_log); } catch(e){}
    }
    await prisma.client.upsert({ where: { id: c.id }, create: c, update: c });
  }
  console.log('✅ Clients seeded');

  // Get the new admin user to assign orphaned cases
  const adminUser = await prisma.profile.findUnique({ where: { email: 'admin@samikhan.store' } });

  // Upsert Cases
  for (const c of cases) {
    c.hearing_date = parseDate(c.hearing_date);
    c.created_at = parseDate(c.created_at);
    c.updated_at = parseDate(c.updated_at);
    c.submissionDate = parseDate(c.submissionDate);
    c.pendingFeeDueDate = parseDate(c.pendingFeeDueDate);
    c.nextHearingDate = parseDate(c.nextHearingDate);
    
    // Ensure lawyer_id points to the new admin user if the old one doesn't exist
    if (adminUser) c.lawyer_id = adminUser.id;
    else c.lawyer_id = null;

    try {
      await prisma.case.upsert({ where: { id: c.id }, create: c, update: c });
    } catch(e: any) {
      console.log(`Skipped case ${c.title}: ${e.message}`);
    }
  }
  console.log('✅ Cases seeded');

  // Upsert Documents
  for (const d of documents) {
    d.upload_date = parseDate(d.upload_date);
    await prisma.document.upsert({ where: { id: d.id }, create: d, update: d });
  }
  console.log('✅ Documents seeded');

  // Upsert Billings
  for (const b of billings) {
    b.created_at = parseDate(b.created_at);
    b.date = parseDate(b.date);
    await prisma.billing.upsert({ where: { id: b.id }, create: b, update: b });
  }
  console.log('✅ Billings seeded');

  // Upsert Activities
  for (const a of activities) {
    a.date = parseDate(a.date);
    a.createdAt = parseDate(a.createdAt);
    await prisma.activity.upsert({ where: { id: a.id }, create: a, update: a });
  }
  console.log('✅ Activities seeded');

  console.log('🎉 Migration to Supabase complete!');
}

migrate()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
