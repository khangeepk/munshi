const Database = require('./node_modules/better-sqlite3');
const db = new Database('./dev.db');

// Get admin ID
const admin = db.prepare("SELECT id FROM profiles WHERE email='admin'").get();
console.log('Admin ID:', admin.id);

// Assign all orphaned cases (lawyer_id IS NULL) to the admin
const result = db.prepare('UPDATE cases SET lawyer_id = ? WHERE lawyer_id IS NULL').run(admin.id);
console.log('Cases updated with admin lawyer_id:', result.changes);

// Verify
const cases = db.prepare('SELECT id, title, lawyer_id, case_status, nextHearingDate FROM cases').all();
console.log('\nAll cases after fix:');
cases.forEach((c, i) => {
  const hasHearing = c.nextHearingDate ? '📅 ' + c.nextHearingDate.split('T')[0] : 'no hearing';
  console.log(`  ${i+1}. ${c.title} | lawyer_id: ${c.lawyer_id ? '✅' : '❌'} | ${hasHearing}`);
});

console.log('\nTotal cases:', cases.length);
db.close();
