import { query } from './server/db/client.js';

async function migrateProductsTable() {
  try {
    console.log('Starting products table migration...');

    // Drop the existing table
    console.log('Dropping existing products table...');
    await query('DROP TABLE IF EXISTS products CASCADE');

    // Create the new simplified table
    console.log('Creating new products table...');
    await query(`
      CREATE TABLE products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255)
      )
    `);

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  }
}

migrateProductsTable().catch(console.error);