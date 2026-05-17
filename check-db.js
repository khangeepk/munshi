const Database = require('./node_modules/better-sqlite3');
const path = require('path');

function auditDb(dbPath, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`DB: ${label} — ${dbPath}`);
  console.log('='.repeat(60));
  try {
    const db = new Database(dbPath);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    console.log(`Tables (${tables.length}):`, tables.map(t => t.name).join(', '));
    for (const { name } of tables) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as c FROM "${name}"`).get();
        console.log(`  [${name}] → ${count.c} records`);
      } catch(e) { console.log(`  [${name}] → ERROR: ${e.message}`); }
    }
    db.close();
  } catch(e) { console.log(`CANNOT OPEN: ${e.message}`); }
}

auditDb('./dev.db', 'ROOT dev.db');
auditDb('./prisma/dev.db', 'PRISMA/dev.db');

// Scan for any other .db or .sqlite files
const fs = require('fs');
function findDbs(dir, depth = 0) {
  if (depth > 4) return;
  try {
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (f === 'node_modules' || f === '.git' || f === '.next') continue;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) findDbs(full, depth + 1);
      else if (f.endsWith('.db') || f.endsWith('.sqlite') || f.endsWith('.sqlite3')) {
        console.log(`\nFOUND DB FILE: ${full} (${(stat.size/1024).toFixed(1)} KB)`);
      }
    }
  } catch(e) {}
}
console.log('\n=== SCANNING FOR ALL DB FILES ===');
findDbs('.');

// Check for backup files
console.log('\n=== SCANNING FOR BACKUP/DATA FILES ===');
findDbs = function(dir, depth = 0) {
  if (depth > 4) return;
  try {
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (f === 'node_modules' || f === '.git' || f === '.next') continue;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) findDbs(full, depth + 1);
      else if (/\.(sql|dump|bak|json|csv)$/i.test(f) && stat.size > 100) {
        console.log(`  BACKUP/DATA: ${full} (${(stat.size/1024).toFixed(1)} KB)`);
      }
    }
  } catch(e) {}
};
findDbs('.');
