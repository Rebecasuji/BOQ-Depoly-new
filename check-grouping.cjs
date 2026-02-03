const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkGrouping() {
  try {
    const sessionId = 'DOOR-1769850961129';
    console.log('=== DETAILED BREAKDOWN OF SESSION RECORDS ===');
    const result = await pool.query(
      'SELECT id, item, qty, supply_rate, install_rate, door_type, panel_type, sub_option, glazing_type FROM estimator_step9_cart WHERE bill_no = $1 AND estimator = $2 ORDER BY created_at DESC',
      [sessionId, 'doors']
    );

    console.log(`Total records: ${result.rows.length}`);

    // Group by door type combinations
    const groups = {};
    result.rows.forEach(row => {
      const key = `${row.door_type}||${row.panel_type}||${row.sub_option}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    console.log('\n=== GROUP BREAKDOWN ===');
    Object.keys(groups).forEach(key => {
      const [doorType, panelType, subOption] = key.split('||');
      const label = `${panelType === 'panel' ? 'With Panel' : 'Without Panel'} – ${doorType}${subOption ? ' (' + subOption + ')' : ''}`;
      console.log(`${label}: ${groups[key].length} items`);
      groups[key].slice(0, 3).forEach(item => {
        console.log(`  - ${item.item} (Qty: ${item.qty})`);
      });
      if (groups[key].length > 3) console.log(`  ... and ${groups[key].length - 3} more`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

checkGrouping();