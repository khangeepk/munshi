const Database = require('./node_modules/better-sqlite3');

const oldDb = new Database('./prisma/dev.db', { readonly: true });

// Get first case with proper quoting
const firstCase = oldDb.prepare('SELECT * FROM "Case" LIMIT 1').get();
console.log('=== FIRST CASE ===');
console.log(JSON.stringify(firstCase, null, 2));

// Get all cases
const allCases = oldDb.prepare('SELECT * FROM "Case"').all();
console.log(`\n=== ALL ${allCases.length} CASES ===`);
allCases.forEach((c, i) => {
  console.log(`\nCase #${i+1}:`, JSON.stringify(c));
});

oldDb.close();
