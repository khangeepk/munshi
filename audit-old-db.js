// PHASE 1A: Deep audit of legacy prisma/dev.db
const Database = require('./node_modules/better-sqlite3');
const path = require('path');

const oldDb = new Database('./prisma/dev.db');

// Get all columns for each table
const tables = oldDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
for (const { name } of tables) {
  if (name.startsWith('_')) continue;
  const cols = oldDb.prepare(`PRAGMA table_info("${name}")`).all();
  console.log(`\n=== TABLE: ${name} ===`);
  console.log('Columns:', cols.map(c => `${c.name}(${c.type})`).join(', '));
  const rows = oldDb.prepare(`SELECT * FROM "${name}" LIMIT 20`).all();
  console.log(`Records (${rows.length}):`, JSON.stringify(rows, null, 2));
}
oldDb.close();
