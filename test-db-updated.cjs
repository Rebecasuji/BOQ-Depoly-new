const { Pool } = require('pg');
require('dotenv').config();

async function testDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await pool.connect();
    console.log('Connected to database successfully');

    // Check if table exists
    const tableResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'estimator_step9_cart'
    `);

    if (tableResult.rows.length === 0) {
      console.log('❌ Table estimator_step9_cart does not exist');
      return;
    } else {
      console.log('✅ Table estimator_step9_cart exists');

      // Check table structure
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'estimator_step9_cart'
        ORDER BY ordinal_position
      `);
      console.log('Table columns:', columnsResult.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

      // Check if there's any data
      const dataResult = await pool.query('SELECT COUNT(*) as count FROM estimator_step9_cart');
      console.log('Total records in table:', dataResult.rows[0].count);

      if (parseInt(dataResult.rows[0].count) > 0) {
        // Show a sample record
        const sampleResult = await pool.query('SELECT * FROM estimator_step9_cart LIMIT 1');
        console.log('Sample record:');
        console.log(JSON.stringify(sampleResult.rows[0], null, 2));
      }

      // Test a simple insert and delete
      console.log('\n--- Testing INSERT operation ---');
      const testSessionId = 'TEST-SESSION-' + Date.now();
      const testData = {
        estimator: 'doors',
        session_id: testSessionId,
        items: [{
          s_no: 1,
          name: 'Test Material',
          unit: 'sqft',
          quantity: 10,
          supply_rate: 100,
          install_rate: 50,
          material_id: null, // Use null for UUID columns in test
          batch_id: null,
          row_id: 'test-row-' + Date.now(),
          shop_id: null, // Use null for UUID columns in test
          description: 'Test description',
          door_type: 'flush',
          panel_type: null,
          sub_option: null,
          glazing_type: null
        }]
      };

      // Test the database insert directly
      const item = testData.items[0];
      const insertResult = await pool.query(`
        INSERT INTO estimator_step9_cart (
          estimator, bill_no, s_no, item, description, unit, qty, rate, amount,
          material_id, batch_id, row_id, shop_id, supply_rate, install_rate,
          door_type, panel_type, sub_option, glazing_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      `, [
        testData.estimator, testData.session_id, item.s_no, item.name || item.item,
        item.description, item.unit, item.quantity || item.qty,
        (item.supply_rate || 0) + (item.install_rate || 0),
        ((item.quantity || item.qty || 0) * ((item.supply_rate || 0) + (item.install_rate || 0))),
        item.material_id, item.batch_id, item.row_id, item.shop_id,
        item.supply_rate, item.install_rate,
        item.door_type, item.panel_type, item.sub_option, item.glazing_type
      ]);

      console.log('✅ INSERT successful');

      // Test retrieval
      console.log('\n--- Testing SELECT operation ---');
      const selectResult = await pool.query(
        'SELECT * FROM estimator_step9_cart WHERE bill_no = $1 AND estimator = $2',
        [testSessionId, testData.estimator]
      );
      console.log('✅ SELECT successful, found', selectResult.rows.length, 'records');
      if (selectResult.rows.length > 0) {
        console.log('Sample record keys:', Object.keys(selectResult.rows[0]));
      }

      // Test delete
      console.log('\n--- Testing DELETE operation ---');
      const deleteResult = await pool.query(
        'DELETE FROM estimator_step9_cart WHERE bill_no = $1 AND estimator = $2',
        [testSessionId, testData.estimator]
      );
      console.log('✅ DELETE successful, deleted', deleteResult.rowCount, 'records');

      // Verify delete
      const verifyResult = await pool.query(
        'SELECT COUNT(*) as count FROM estimator_step9_cart WHERE bill_no = $1 AND estimator = $2',
        [testSessionId, testData.estimator]
      );
      console.log('✅ Verification: records remaining for session:', verifyResult.rows[0].count);
    }

  } catch (err) {
    console.error('❌ Database error:', err.message);
    console.error('Full error:', err);
  } finally {
    await pool.end();
    console.log('Database connection closed');
  }
}

testDatabase();