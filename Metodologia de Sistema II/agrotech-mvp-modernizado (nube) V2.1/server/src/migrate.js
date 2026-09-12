require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./db');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  await db.query(sql);
  console.log('✅ Esquema aplicado correctamente');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Error aplicando el esquema:', err.message);
  process.exit(1);
});
