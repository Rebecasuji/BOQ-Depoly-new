const { query } = require('./server/db/client');

async function checkTables() {
  try {
    const tables = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'estimator_%'");
    console.log('Estimator tables:', tables.rows.map(r => r.table_name));

    if (tables.rows.length > 0) {
      for (const table of tables.rows) {
        const columns = await query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table.table_name}' AND table_schema = 'public'`);
        console.log(`${table.table_name} columns:`, columns.rows.map(r => r.column_name));
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

checkTables();