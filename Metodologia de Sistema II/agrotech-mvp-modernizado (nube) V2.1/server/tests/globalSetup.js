const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Los tests escriben datos reales: solo corren contra una base local, nunca contra Supabase.
module.exports = async () => {
  const url = process.env.DATABASE_URL || '';
  if (!/@(localhost|127\.0\.0\.1)(:|\/)/.test(url)) {
    throw new Error(
      'Los tests necesitan DATABASE_URL apuntando a un Postgres local (localhost o 127.0.0.1). ' +
        'Ejemplo: DATABASE_URL=postgres://postgres:test@localhost:55432/postgres npm test'
    );
  }

  const pool = new Pool({ connectionString: url, ssl: false });
  try {
    const { rows } = await pool.query("SELECT to_regclass('public.productores') AS tabla");
    if (!rows[0].tabla) {
      await pool.query(fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8'));
    }
  } finally {
    await pool.end();
  }
};
