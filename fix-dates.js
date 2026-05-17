/**
 * FIX: Convert all datetime fields from ISO strings to Unix milliseconds.
 * 
 * Prisma 7's better-sqlite3 adapter stores/reads DateTimes as INTEGER (ms since epoch).
 * Our migration script stored them as ISO text strings — this causes parse errors.
 * This script converts ALL datetime columns in ALL tables to proper integer ms values.
 */

const Database = require('./node_modules/better-sqlite3');
const db = new Database('./dev.db');

function toMs(val) {
  if (val == null) return null;
  if (typeof val === 'number') return val; // already ms
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.getTime();
}

// Table → array of datetime column names
const DATETIME_COLS = {
  profiles: ['created_at', 'updated_at'],
  clients:  ['created_at', 'updated_at', 'date_of_birth'],
  cases:    ['created_at', 'updated_at', 'hearing_date', 'submissionDate', 'pendingFeeDueDate', 'nextHearingDate'],
  billings: ['created_at', 'date'],
  documents:['upload_date'],
  activities: ['date', 'createdAt'],
  billable_hours: ['start_time', 'end_time', 'created_at'],
  trust_accounts: ['created_at', 'updated_at'],
  trust_transactions: ['created_at'],
  associate_commissions: ['paid_at', 'created_at'],
  whatsapp_queue: ['sentAt', 'createdAt', 'updatedAt'],
};

let totalFixed = 0;

for (const [table, cols] of Object.entries(DATETIME_COLS)) {
  // Check table exists
  const exists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
  if (!exists) { console.log(`[SKIP] Table not found: ${table}`); continue; }

  const rows = db.prepare(`SELECT * FROM "${table}"`).all();
  if (rows.length === 0) { console.log(`[SKIP] ${table} — empty`); continue; }

  let tableFixed = 0;
  const updateStmt = db.prepare(
    `UPDATE "${table}" SET ${cols.map(c => `"${c}" = ?`).join(', ')} WHERE id = ?`
  );

  const fix = db.transaction(() => {
    for (const row of rows) {
      const values = cols.map(col => toMs(row[col]));
      const changed = cols.some((col, i) => {
        const orig = row[col];
        const converted = values[i];
        return orig !== null && typeof orig === 'string' && converted !== null;
      });
      if (changed) {
        updateStmt.run(...values, row.id);
        tableFixed++;
      }
    }
  });

  fix();
  console.log(`[${table}] Fixed ${tableFixed}/${rows.length} rows`);
  totalFixed += tableFixed;
}

console.log(`\n✅ Total rows updated: ${totalFixed}`);

// Verify: read back one case
const c = db.prepare('SELECT id, title, nextHearingDate, hearing_date, created_at FROM cases LIMIT 2').all();
console.log('\nSample cases after fix:');
c.forEach(row => {
  console.log(`  ${row.title}: nextHearingDate=${row.nextHearingDate} (type=${typeof row.nextHearingDate})`);
  console.log(`    hearing_date=${row.hearing_date} created_at=${row.created_at}`);
});

db.close();
