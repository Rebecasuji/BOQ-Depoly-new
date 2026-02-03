const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifyAPI() {
  try {
    const sessionId = 'DOOR-1769850961129';
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM estimator_step9_cart WHERE bill_no = $1 AND estimator = $2',
      [sessionId, 'doors']
    );
    console.log(`Session ${sessionId} has ${result.rows[0].count} records`);

    // Check if API would return all records
    const allRecords = await pool.query(
      'SELECT * FROM estimator_step9_cart WHERE bill_no = $1 AND estimator = $2 ORDER BY created_at DESC',
      [sessionId, 'doors']
    );
    console.log(`API would return ${allRecords.rows.length} items`);

    // Simulate API transformation
    const transformedItems = allRecords.rows.map(row => ({
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

    console.log(`Transformed items count: ${transformedItems.length}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

verifyAPI();