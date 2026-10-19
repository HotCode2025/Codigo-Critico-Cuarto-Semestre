const { Pool } = require('pg');

// Supabase exige SSL; una base local no lo tiene. DATABASE_SSL=false lo apaga para bases locales
// que no se llaman localhost (por ejemplo el servicio `db` de docker-compose).
const sinSsl = process.env.DATABASE_SSL === 'false' || process.env.DATABASE_URL?.includes('localhost');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sinSsl ? false : { rejectUnauthorized: false }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
