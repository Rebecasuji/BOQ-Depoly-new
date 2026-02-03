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

        // Test a simple insert and delete
        console.log('\n--- Testing INSERT operation ---');
        const testData = {
          estimator: 'doors',
          session_id: 'TEST-SESSION-' + Date.now(),
          s_no: 1,
          row_id: 'test-row-' + Date.now(),
          batch_id: null,
          material_id: 'test-material',
          name: 'Test Material',
          unit: 'sqft',
          quantity: 10,
          supply_rate: 100,
          install_rate: 50,
          shop_id: 'test-shop',
          shop_name: 'Test Shop',
          description: 'Test description',
          location: 'Test location',
          door_type: 'flush',
          panel_type: null,
          sub_option: null,
          glazing_type: null,
          qty: 1,
          height: 7,
          width: 3,
          glass_height: 6,
          glass_width: 2,
          subtotal: 1500,
          sgst: 135,
          cgst: 135,
          round_off: 0.5,
          grand_total: 1770.5
        };

        const insertResult = await pool.query(`
          INSERT INTO estimator_step9_cart (
            estimator, session_id, s_no, row_id, batch_id, material_id, name, unit,
            quantity, supply_rate, install_rate, shop_id, shop_name, description,
            location, door_type, panel_type, sub_option, glazing_type, qty,
            height, width, glass_height, glass_width, subtotal, sgst, cgst,
            round_off, grand_total, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
            $27, $28, $29, NOW()
          ) RETURNING id
        `, [
          testData.estimator, testData.session_id, testData.s_no, testData.row_id,
          testData.batch_id, testData.material_id, testData.name, testData.unit,
          testData.quantity, testData.supply_rate, testData.install_rate,
          testData.shop_id, testData.shop_name, testData.description,
          testData.location, testData.door_type, testData.panel_type,
          testData.sub_option, testData.glazing_type, testData.qty,
          testData.height, testData.width, testData.glass_height,
          testData.glass_width, testData.subtotal, testData.sgst,
          testData.cgst, testData.round_off, testData.grand_total
        ]);

        console.log('✅ INSERT successful, inserted ID:', insertResult.rows[0].id);

        // Test retrieval
        console.log('\n--- Testing SELECT operation ---');
        const selectResult = await pool.query(
          'SELECT * FROM estimator_step9_cart WHERE session_id = $1',
          [testData.session_id]
        );
        console.log('✅ SELECT successful, found', selectResult.rows.length, 'records');

        // Test delete
        console.log('\n--- Testing DELETE operation ---');
        const deleteResult = await pool.query(
          'DELETE FROM estimator_step9_cart WHERE session_id = $1',
          [testData.session_id]
        );
        console.log('✅ DELETE successful, deleted', deleteResult.rowCount, 'records');

        // Verify delete
        const verifyResult = await pool.query(
          'SELECT COUNT(*) as count FROM estimator_step9_cart WHERE session_id = $1',
          [testData.session_id]
        );
        console.log('✅ Verification: records remaining for session:', verifyResult.rows[0].count);

      } else {
        console.log('No existing data in table');
      }
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