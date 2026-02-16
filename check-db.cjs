const { Client } = require('pg');
const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'boq',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
});

async function checkSchema() {
  try {
    await client.connect();
    console.log('Connected to database');

    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'material_templates'
      ORDER BY ordinal_position
    `);

    console.log('\nMaterial Templates Table Schema:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable})`);
    });

    // Check if there are any material templates
    const templates = await client.query('SELECT id, name, vendor_category, tax_code_type, tax_code_value FROM material_templates LIMIT 3');
    console.log('\nSample Material Templates:');
    templates.rows.forEach(row => {
      console.log(`  ${row.name}: vendor_category='${row.vendor_category}', tax_code='${row.tax_code_type}:${row.tax_code_value}'`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkSchema();