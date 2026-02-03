const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkMaterialIds() {
  try {
    const result = await pool.query('SELECT material_id FROM estimator_step9_cart LIMIT 5');
    console.log('Sample material_ids:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.material_id}`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

checkMaterialIds();