const { query } = require('./server/db/client.ts');
const fs = require('fs');

async function createTables() {
  try {
    const sql = fs.readFileSync('./create-estimator-tables.sql', 'utf8');
    console.log('Executing SQL...');
    await query(sql);
    console.log('Tables created successfully!');
  } catch (err) {
    console.error('Error creating tables:', err);
  }
  process.exit(0);
}

createTables();