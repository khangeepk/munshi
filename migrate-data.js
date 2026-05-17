/**
 * FULL DATA MIGRATION SCRIPT
 * Migrates all 14 cases and 2 users from prisma/dev.db (old schema) → dev.db (new schema)
 * 
 * Old schema tables: Case, User, Document, Activity, Payment
 * New schema tables: cases, profiles, clients, billings, documents, activities
 *
 * Mapping:
 *   old.Case  → new.cases  (columns are mostly compatible)
 *   old.User  → new.profiles (name → full_name, id same)
 *   old.Document → new.documents
 *   old.Activity → new.activities (if any)
 *   old.Payment  → new.billings (if any)
 */

const Database = require('./node_modules/better-sqlite3');
const { randomUUID } = require('crypto');

const oldDb = new Database('./prisma/dev.db', { readonly: true });
const newDb = new Database('./dev.db');

// ─── Read all old data ─────────────────────────────────────────────────────
const oldCases    = oldDb.prepare('SELECT * FROM "Case"').all();
const oldUsers    = oldDb.prepare('SELECT * FROM "User"').all();
const oldDocs     = oldDb.prepare('SELECT * FROM "Document"').all();
const oldActs     = oldDb.prepare('SELECT * FROM "Activity"').all();
const oldPayments = oldDb.prepare('SELECT * FROM "Payment"').all();
oldDb.close();

console.log('='.repeat(60));
console.log('LEGACY DATA INVENTORY');
console.log('='.repeat(60));
console.log(`  Cases:      ${oldCases.length}`);
console.log(`  Users:      ${oldUsers.length}`);
console.log(`  Documents:  ${oldDocs.length}`);
console.log(`  Activities: ${oldActs.length}`);
console.log(`  Payments:   ${oldPayments.length}`);
console.log('');

// ─── Check current state of new DB ────────────────────────────────────────
const existingCases    = newDb.prepare('SELECT COUNT(*) as c FROM cases').get().c;
const existingClients  = newDb.prepare('SELECT COUNT(*) as c FROM clients').get().c;
const existingProfiles = newDb.prepare('SELECT COUNT(*) as c FROM profiles').get().c;

console.log('CURRENT NEW DB STATE');
console.log(`  profiles: ${existingProfiles}  cases: ${existingCases}  clients: ${existingClients}`);
console.log('');

// Check for existing cases to avoid duplicate migration
const existingCaseIds = new Set(
  newDb.prepare('SELECT id FROM cases').all().map(r => r.id)
);

// ─── BEGIN MIGRATION TRANSACTION ──────────────────────────────────────────
const migrate = newDb.transaction(() => {
  let migratedCases    = 0;
  let migratedUsers    = 0;
  let migratedClients  = 0;
  let migratedDocs     = 0;
  let migratedPayments = 0;
  let skipped          = 0;

  // ── 1. Migrate Users → Profiles ─────────────────────────────────────────
  // old.User: id, email, name, role, passwordHash, avatarUrl, createdAt, updatedAt
  // new.profiles: id, full_name, role, law_firm_name, email, passwordHash, avatarUrl, created_at, updated_at
  const existingEmails = new Set(
    newDb.prepare('SELECT email FROM profiles').all().map(r => r.email)
  );

  const insertProfile = newDb.prepare(`
    INSERT OR IGNORE INTO profiles
      (id, full_name, role, email, passwordHash, avatarUrl, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const u of oldUsers) {
    if (existingEmails.has(u.email)) {
      console.log(`  [User] SKIP (already exists): ${u.email}`);
      continue;
    }
    insertProfile.run(
      u.id,
      u.name || u.email,
      u.role || 'DATA_ENTRY',
      u.email,
      u.passwordHash || null,
      u.avatarUrl || null,
      u.createdAt || new Date().toISOString(),
      u.updatedAt || new Date().toISOString()
    );
    console.log(`  [Profile] MIGRATED: ${u.email} (${u.role})`);
    migratedUsers++;
  }

  // ── 2. Create a "legacy" client placeholder for orphaned cases ───────────
  // Old schema had no clients table — cases reference no client_id
  // We'll create one "Legacy Client" and associate all old cases to it
  const LEGACY_CLIENT_ID = 'legacy-migration-client-00000000';
  const existingLegacy = newDb.prepare('SELECT id FROM clients WHERE id = ?').get(LEGACY_CLIENT_ID);
  
  if (!existingLegacy) {
    newDb.prepare(`
      INSERT INTO clients (id, name, phone, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      LEGACY_CLIENT_ID,
      'Qaiser Rana (Migrated)',
      '+923000000000',
      'Auto-created during data migration. Update this client record.',
      new Date().toISOString(),
      new Date().toISOString()
    );
    console.log(`  [Client] Created legacy placeholder: ${LEGACY_CLIENT_ID}`);
    migratedClients++;
  }

  // ── 3. Migrate Cases ──────────────────────────────────────────────────────
  // old.Case columns: id, title, caseType, caseFrom, caseAgainst, submissionDate,
  //   firNumber, location, judgeName, nextHearingDate, decision, remarks, status,
  //   lawyerId, createdAt, updatedAt, clientPhone, pendingFeeDueDate, totalFee
  // new.cases columns: id, title, client_id, lawyer_id, court_name, case_status,
  //   hearing_date, created_at, updated_at, caseType, caseAgainst, caseFrom,
  //   clientPhone, submissionDate, firNumber, location, judgeName, totalFee,
  //   pendingFeeDueDate, nextHearingDate, decision, remarks

  const insertCase = newDb.prepare(`
    INSERT OR IGNORE INTO cases (
      id, title, client_id, lawyer_id, court_name, case_status, hearing_date,
      created_at, updated_at,
      caseType, caseAgainst, caseFrom, clientPhone, submissionDate,
      firNumber, location, judgeName, totalFee, pendingFeeDueDate,
      nextHearingDate, decision, remarks
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?
    )
  `);

  for (const c of oldCases) {
    if (existingCaseIds.has(c.id)) {
      console.log(`  [Case] SKIP (already exists): ${c.title}`);
      skipped++;
      continue;
    }

    // Map old lawyerId to new lawyer_id (must exist in profiles)
    const lawyerExists = c.lawyerId
      ? newDb.prepare('SELECT id FROM profiles WHERE id = ?').get(c.lawyerId)
      : null;

    insertCase.run(
      c.id,
      c.title,
      LEGACY_CLIENT_ID,          // client_id — mapped to legacy placeholder
      lawyerExists ? c.lawyerId : null,
      c.location || 'ISLAMABAD', // court_name
      c.status || 'FILED',       // case_status
      c.nextHearingDate || null,  // hearing_date
      c.createdAt || new Date().toISOString(),
      c.updatedAt || new Date().toISOString(),
      c.caseType || 'Civil',
      c.caseAgainst || '',
      c.caseFrom || '',
      c.clientPhone || null,
      c.submissionDate || new Date().toISOString(),
      c.firNumber || null,
      c.location || 'ISLAMABAD',
      c.judgeName || null,
      c.totalFee || null,
      c.pendingFeeDueDate || null,
      c.nextHearingDate || null,
      c.decision || null,
      c.remarks || null
    );
    console.log(`  [Case] MIGRATED: ${c.title}`);
    migratedCases++;
  }

  // ── 4. Migrate Documents ─────────────────────────────────────────────────
  const insertDoc = newDb.prepare(`
    INSERT OR IGNORE INTO documents (id, case_id, file_path, upload_date, title, category)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const d of oldDocs) {
    const caseExists = newDb.prepare('SELECT id FROM cases WHERE id = ?').get(d.caseId || d.case_id);
    if (!caseExists) { console.log(`  [Doc] SKIP (no matching case): ${d.id}`); continue; }
    insertDoc.run(
      d.id,
      d.caseId || d.case_id,
      d.filePath || d.file_path || '',
      d.uploadDate || d.upload_date || new Date().toISOString(),
      d.title || 'Document',
      d.category || 'MISC'
    );
    migratedDocs++;
  }

  // ── 5. Migrate Payments → Billings ─────────────────────────────────────
  const insertBilling = newDb.prepare(`
    INSERT OR IGNORE INTO billings (id, case_id, amount, status, created_at, method, date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const p of oldPayments) {
    const caseExists = newDb.prepare('SELECT id FROM cases WHERE id = ?').get(p.caseId || p.case_id);
    if (!caseExists) { console.log(`  [Payment] SKIP (no matching case): ${p.id}`); continue; }
    insertBilling.run(
      p.id,
      p.caseId || p.case_id,
      p.amount || 0,
      p.status || 'paid',
      p.createdAt || p.created_at || new Date().toISOString(),
      p.method || 'Cash',
      p.date || p.createdAt || new Date().toISOString()
    );
    migratedPayments++;
  }

  return { migratedCases, migratedUsers, migratedClients, migratedDocs, migratedPayments, skipped };
});

// ─── Run Migration ─────────────────────────────────────────────────────────
try {
  const result = migrate();
  console.log('');
  console.log('='.repeat(60));
  console.log('MIGRATION COMPLETE ✅');
  console.log('='.repeat(60));
  console.log(`  Profiles migrated:  ${result.migratedUsers}`);
  console.log(`  Clients created:    ${result.migratedClients}`);
  console.log(`  Cases migrated:     ${result.migratedCases}`);
  console.log(`  Documents migrated: ${result.migratedDocs}`);
  console.log(`  Payments migrated:  ${result.migratedPayments}`);
  console.log(`  Skipped (dupes):    ${result.skipped}`);

  // Verify
  console.log('');
  console.log('VERIFICATION:');
  console.log(`  new profiles: ${newDb.prepare('SELECT COUNT(*) as c FROM profiles').get().c}`);
  console.log(`  new cases:    ${newDb.prepare('SELECT COUNT(*) as c FROM cases').get().c}`);
  console.log(`  new clients:  ${newDb.prepare('SELECT COUNT(*) as c FROM clients').get().c}`);
  console.log(`  new billings: ${newDb.prepare('SELECT COUNT(*) as c FROM billings').get().c}`);
  console.log(`  new docs:     ${newDb.prepare('SELECT COUNT(*) as c FROM documents').get().c}`);

} catch(e) {
  console.error('MIGRATION FAILED:', e.message);
  console.error(e.stack);
}

newDb.close();
