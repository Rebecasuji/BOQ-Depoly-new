const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testDataLoading() {
  try {
    console.log('=== CHECKING CURRENT RECORD COUNT ===');
    const countResult = await pool.query('SELECT COUNT(*) as count FROM estimator_step9_cart');
    console.log(`Current total records: ${countResult.rows[0].count}`);

    // Get all sessions to see which one has data
    console.log('\n=== CHECKING ALL SESSIONS ===');
    const sessionsResult = await pool.query(
      'SELECT bill_no, COUNT(*) as count FROM estimator_step9_cart WHERE estimator = $1 GROUP BY bill_no ORDER BY count DESC',
      ['doors']
    );

    console.log('Sessions with door estimator data:');
    sessionsResult.rows.forEach((session, index) => {
      console.log(`${index + 1}. ${session.bill_no}: ${session.count} records`);
    });

    // Use the session with the most records
    const sessionId = sessionsResult.rows[0]?.bill_no;
    if (!sessionId) {
      console.log('No sessions found with door estimator data');
      return;
    }

    console.log(`\n=== SIMULATING API RESPONSE FOR SESSION: ${sessionId} ===`);
    const sessionResult = await pool.query(
      'SELECT * FROM estimator_step9_cart WHERE bill_no = $1 AND estimator = $2 ORDER BY created_at DESC',
      [sessionId, 'doors']
    );
    console.log(`Records for session ${sessionId}: ${sessionResult.rows.length}`);

    // Transform data like the API does
    const transformedItems = sessionResult.rows.map(row => ({
      id: row.material_id,
      rowId: row.row_id,
      batchId: row.batch_id,
      name: row.item,
      unit: row.unit,
      quantity: parseFloat(row.qty || 0),
      supplyRate: parseFloat(row.supply_rate || 0),
      installRate: parseFloat(row.install_rate || 0),
      shopId: row.shop_id,
      shopName: row.shop_name || '',
      description: row.description || '',
      location: row.location || '',
      doorType: row.door_type,
      panelType: row.panel_type,
      subOption: row.sub_option,
      glazingType: row.glazing_type,
      isSaved: true,
      dbId: row.id
    }));

    console.log('\nSample transformed items:');
    transformedItems.slice(0, 3).forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} (Qty: ${item.quantity}, Rate: ${item.supplyRate + item.installRate})`);
    });

    console.log(`\nTotal items that would be loaded in Step 9: ${transformedItems.length}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

testDataLoading();