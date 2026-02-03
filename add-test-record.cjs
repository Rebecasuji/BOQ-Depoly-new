const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addNewRecord() {
  try {
    console.log('=== ADDING NEW RECORD ===');

    // Get the session with most records
    const sessionsResult = await pool.query(
      'SELECT bill_no FROM estimator_step9_cart WHERE estimator = $1 GROUP BY bill_no ORDER BY COUNT(*) DESC LIMIT 1',
      ['doors']
    );
    const sessionId = sessionsResult.rows[0]?.bill_no;

    if (!sessionId) {
      console.log('No sessions found');
      return;
    }

    console.log(`Adding to session: ${sessionId}`);

    // Add a new record
    const insertResult = await pool.query(`
      INSERT INTO estimator_step9_cart (
        bill_no, estimator, material_id, row_id, batch_id, item, unit, qty,
        supply_rate, install_rate, shop_id, description,
        door_type, panel_type, sub_option, glazing_type, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()
      ) RETURNING id
    `, [
      sessionId, // bill_no
      'doors', // estimator
      null, // material_id
      null, // row_id
      null, // batch_id
      'Test Material for Verification', // item
      'NOS', // unit
      5, // qty
      100.50, // supply_rate
      50.25, // install_rate
      null, // shop_id
      'Added for testing data loading', // description
      'Interior Door', // door_type
      'Solid Panel', // panel_type
      'Standard', // sub_option
      'Clear Glass' // glazing_type
    ]);

    console.log(`New record added with ID: ${insertResult.rows[0].id}`);

    // Check total count after adding
    const countResult = await pool.query('SELECT COUNT(*) as count FROM estimator_step9_cart');
    console.log(`Total records after adding: ${countResult.rows[0].count}`);

    // Check session count after adding
    const sessionCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM estimator_step9_cart WHERE bill_no = $1 AND estimator = $2',
      [sessionId, 'doors']
    );
    console.log(`Records in session ${sessionId} after adding: ${sessionCountResult.rows[0].count}`);

    // Verify the new record is there
    const newRecordResult = await pool.query(
      'SELECT * FROM estimator_step9_cart WHERE id = $1',
      [insertResult.rows[0].id]
    );

    console.log('\n=== NEW RECORD DETAILS ===');
    const record = newRecordResult.rows[0];
    console.log(`ID: ${record.id}`);
    console.log(`Item: ${record.item}`);
    console.log(`Quantity: ${record.qty}`);
    console.log(`Supply Rate: ${record.supply_rate}`);
    console.log(`Install Rate: ${record.install_rate}`);
    console.log(`Total Rate: ${parseFloat(record.supply_rate) + parseFloat(record.install_rate)}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

addNewRecord();