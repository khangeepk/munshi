/**
 * scripts/migrate-legacy-cases-to-sami-khan.ts
 *
 * Idempotent migration script:
 * - Creates "Sami Khan Law Chamber" tenant
 * - Creates sami.khan@test.com advocate user
 * - Migrates all 14 legacy cases from ./dev.db (SQLite) → Supabase PostgreSQL
 * - Creates/upserts client records from legacy case data
 * - Schedules hearing reminders for future nextHearingDate
 *
 * Run: npx tsx scripts/migrate-legacy-cases-to-sami-khan.ts
 */

import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';
import path from 'path';
import { hashPassword } from '../src/lib/password';
import { scheduleHearingReminder } from '../src/services/reminder-service';

const prisma = new PrismaClient();

// ─── Legacy case shape from dev.db ───────────────────────────────────────────
interface LegacyCase {
  id: number | string;
  title: string;
  case_type?: string;
  case_status?: string;
  submissionDate?: string;
  nextHearingDate?: string;
  firNumber?: string;
  location?: string;
  judgeName?: string;
  decision?: string;
  remarks?: string;
  totalFee?: number | null;
  feePaid?: number | null;
  paidDate?: string | null;
  paymentMethod?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientCnic?: string | null;
  clientAddress?: string | null;
  // legacy field names vary
  caseFrom?: string | null;
  caseAgainst?: string | null;
  client_name?: string | null;
}

function safeDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Sami Khan Law Chamber — Legacy Case Migration               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // ─── 1. Create / find Sami Khan tenant ───────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'sami-khan' },
    update: { status: 'ACTIVE' },
    create: {
      name: 'Sami Khan Law Chamber',
      slug: 'sami-khan',
      email: 'sami.khan@laychamber.pk',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Tenant: "${tenant.name}" (${tenant.id})`);

  // ─── 2. Create / find Sami Khan advocate user ─────────────────────────────
  const password = hashPassword('Test@123456');
  const advocate = await prisma.user.upsert({
    where: { email: 'sami.khan@test.com' },
    update: { tenantId: tenant.id, role: 'TENANT_ADMIN', password },
    create: {
      email: 'sami.khan@test.com',
      name: 'Sami Khan',
      password,
      role: 'TENANT_ADMIN',
      tenantId: tenant.id,
      canCreate: true,
      canEdit: true,
      canDelete: true,
    },
  });
  console.log(`✅ Advocate: "${advocate.name}" <${advocate.email}>`);

  // ─── 3. Open legacy SQLite database ──────────────────────────────────────
  const dbPath = path.resolve('./dev.db');
  let legacyDb: ReturnType<typeof Database>;
  try {
    legacyDb = new Database(dbPath, { readonly: true });
    console.log(`\n📂 Opened legacy DB: ${dbPath}`);
  } catch (e) {
    console.error(`❌ Cannot open legacy DB at ${dbPath}:`, e);
    process.exit(1);
  }

  // Get columns that exist in the legacy table
  const tableInfo = legacyDb.prepare("PRAGMA table_info(cases)").all() as { name: string }[];
  const cols = tableInfo.map((c) => c.name);
  console.log(`   Legacy case columns: ${cols.join(', ')}\n`);

  const legacyCases = legacyDb.prepare('SELECT * FROM cases').all() as LegacyCase[];
  console.log(`📋 Found ${legacyCases.length} legacy cases to migrate\n`);
  legacyDb.close();

  // ─── 4. Migrate each case ─────────────────────────────────────────────────
  let migratedCases = 0;
  let skippedCases = 0;
  let migratedClients = 0;
  let migratedHearings = 0;
  let migratedPayments = 0;

  for (const lc of legacyCases) {
    // Determine client name from various possible legacy fields
    const clientName =
      lc.clientName ||
      lc.caseFrom ||
      lc.client_name ||
      `Unknown Client - Case ${lc.id}`;

    // Unique legacy case identifier for idempotency check
    // We store legacy id in caseNumber prefixed with "LEG-"
    const legacyCaseNumber = `LEG-${String(lc.id).replace(/\s+/g, '-')}`;

    // Check if already migrated
    const existing = await prisma.case.findFirst({
      where: { tenantId: tenant.id, caseNumber: legacyCaseNumber },
    });

    if (existing) {
      console.log(`  ⏭  Skipping (already migrated): ${legacyCaseNumber} — ${lc.title}`);
      skippedCases++;
      continue;
    }

    // Upsert client record
    let client = await prisma.client.findFirst({
      where: { tenantId: tenant.id, name: clientName },
    });
    if (!client) {
      client = await prisma.client.create({
        data: {
          tenantId: tenant.id,
          name: clientName,
          phone: (lc as any).clientPhone || (lc as any).phone || '0000000000',
          email: (lc as any).clientEmail || (lc as any).email || null,
          cnic: (lc as any).clientCnic || (lc as any).cnic || null,
          address: (lc as any).clientAddress || (lc as any).address || null,
        },
      });
      migratedClients++;
      console.log(`  👤 Created client: ${clientName}`);
    }

    // Map legacy status to enum
    const rawStatus = ((lc.case_status || 'FILED') as string).toUpperCase().replace(/ /g, '_');
    const validStatuses = ['PRE_LITIGATION', 'FILED', 'ONGOING', 'STAYED', 'DISPOSED', 'APPEALED', 'CLOSED'];
    const caseStatus = validStatuses.includes(rawStatus) ? rawStatus : 'FILED';

    // Create case
    const newCase = await prisma.case.create({
      data: {
        tenantId: tenant.id,
        clientId: client.id,
        assignedToId: advocate.id,
        caseTitle: (lc.title as string) || 'Untitled Case',
        caseNumber: legacyCaseNumber,
        courtName: (lc.location as string) || (lc as any).court_name || 'Unknown Court',
        caseType: (lc.case_type as string) || 'General',
        status: caseStatus as any,
        oppositeParty: (lc.caseAgainst as string) || (lc as any).case_against || 'Unknown Party',
        firNumber: (lc.firNumber as string) || null,
        judgeName: (lc.judgeName as string) || null,
        filingDate: safeDate(lc.submissionDate as string) || new Date(),
        nextHearingDate: safeDate(lc.nextHearingDate as string),
        internalNotes: (lc.remarks as string) || (lc.decision as string) || null,
        createdAt: safeDate(lc.submissionDate as string) || new Date(),
      },
    });
    migratedCases++;
    console.log(`  ✅ Case: [${legacyCaseNumber}] ${newCase.caseTitle}`);

    // Create explicit hearing record if nextHearingDate exists
    const hDate = safeDate(lc.nextHearingDate as string);
    if (hDate) {
      const hearing = await prisma.hearing.create({
        data: {
          tenantId: tenant.id,
          caseId: newCase.id,
          hearingDate: hDate,
          courtName: newCase.courtName,
          purpose: 'Legacy hearing (migrated)',
          status: hDate > new Date() ? 'SCHEDULED' : 'HEARD',
          createdById: advocate.id,
        },
      });
      migratedHearings++;

      // Schedule reminder if hearing is in the future
      if (hDate > new Date()) {
        try {
          await scheduleHearingReminder(hearing);
          console.log(`     📅 Reminder scheduled for ${hDate.toLocaleDateString('en-PK')}`);
        } catch (_) {}
      }
    }

    // Migrate fee/payment data
    const totalFee = parseFloat(String(lc.totalFee || 0));
    const feePaid = parseFloat(String(lc.feePaid || 0));

    if (totalFee > 0) {
      const invoice = await prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          clientId: client.id,
          caseId: newCase.id,
          invoiceNumber: `INV-LEG-${lc.id}`,
          amount: totalFee,
          totalAmount: totalFee,
          paidAmount: feePaid,
          status: feePaid >= totalFee ? 'PAID' : feePaid > 0 ? 'PARTIAL' : 'DRAFT',
        },
      });

      if (feePaid > 0) {
        await prisma.payment.create({
          data: {
            tenantId: tenant.id,
            clientId: client.id,
            caseId: newCase.id,
            invoiceId: invoice.id,
            amount: feePaid,
            method: (lc.paymentMethod as string) || 'Cash',
            status: 'COMPLETED',
            paidAt: safeDate(lc.paidDate as string) || new Date(),
          },
        });
        migratedPayments++;
      }
    }
  }

  // ─── 5. Summary ──────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  MIGRATION COMPLETE                                           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`  Total legacy cases found : ${legacyCases.length}`);
  console.log(`  Cases migrated           : ${migratedCases}`);
  console.log(`  Cases skipped (existing) : ${skippedCases}`);
  console.log(`  Clients created          : ${migratedClients}`);
  console.log(`  Hearings migrated        : ${migratedHearings}`);
  console.log(`  Payments migrated        : ${migratedPayments}`);
  console.log('\n  Login credentials for manual review:');
  console.log('  ─────────────────────────────────────');
  console.log('  URL      : http://localhost:3000');
  console.log('  Email    : sami.khan@test.com');
  console.log('  Password : Test@123456');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
