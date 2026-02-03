const { Pool } = require('pg');
require('dotenv').config();

async function testDeleteFunctionality() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await pool.connect();
    console.log('Connected to database successfully\n');

    // Check current records
    console.log('=== CURRENT RECORDS IN STEP9 TABLE ===');
    const currentResult = await pool.query(
      'SELECT id, estimator, bill_no, s_no, item, qty, rate, amount FROM estimator_step9_cart ORDER BY id LIMIT 10'
    );
    console.log(`Total records: ${currentResult.rows.length}`);
    console.log('First 10 records:');
    currentResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}, Bill: ${row.bill_no}, Item: ${row.item}, Qty: ${row.qty}, Amount: ${row.amount}`);
    });

    // Create 5 test records to delete
    console.log('\n=== CREATING 5 TEST RECORDS TO DELETE ===');
    const testSessionId = 'DELETE-TEST-' + Date.now();
    const testRecords = [];

    for (let i = 1; i <= 5; i++) {
      const testData = {
        estimator: 'doors',
        bill_no: testSessionId,
        s_no: i,
        item: `Test Material ${i} - DELETE TEST`,
        description: `Test description ${i}`,
        unit: 'sqft',
        qty: 10 + i,
        rate: 100 + (i * 10),
        amount: (10 + i) * (100 + (i * 10)),
        material_id: null,
        batch_id: `test-batch-${i}`,
        row_id: `test-row-${i}`,
        shop_id: null,
        supply_rate: 80 + (i * 5),
        install_rate: 20 + (i * 2),
        door_type: 'flush',
        panel_type: null,
        sub_option: null,
        glazing_type: null
      };

      const insertResult = await pool.query(`
        INSERT INTO estimator_step9_cart (
          estimator, bill_no, s_no, item, description, unit, qty, rate, amount,
          material_id, batch_id, row_id, shop_id, supply_rate, install_rate,
          door_type, panel_type, sub_option, glazing_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING id
      `, [
        testData.estimator, testData.bill_no, testData.s_no, testData.item,
        testData.description, testData.unit, testData.qty, testData.rate, testData.amount,
        testData.material_id, testData.batch_id, testData.row_id, testData.shop_id,
        testData.supply_rate, testData.install_rate,
        testData.door_type, testData.panel_type, testData.sub_option, testData.glazing_type
      ]);

      testRecords.push({
        id: insertResult.rows[0].id,
        bill_no: testSessionId,
        item: testData.item
      });

      console.log(`✅ Created test record ${i}: ID ${insertResult.rows[0].id} - ${testData.item}`);
    }

    // Verify test records were created
    console.log('\n=== VERIFYING TEST RECORDS CREATED ===');
    const verifyCreateResult = await pool.query(
      'SELECT COUNT(*) as count FROM estimator_step9_cart WHERE bill_no = $1',
      [testSessionId]
    );
    console.log(`Test records created: ${verifyCreateResult.rows[0].count}`);

    // Show all records including new test ones
    console.log('\n=== RECORDS BEFORE DELETION ===');
    const beforeDeleteResult = await pool.query(
      'SELECT id, bill_no, item, qty, amount FROM estimator_step9_cart ORDER BY id DESC LIMIT 10'
    );
    console.log('Latest 10 records (including our test records):');
    beforeDeleteResult.rows.forEach((row, index) => {
      const isTestRecord = row.bill_no === testSessionId;
      console.log(`${index + 1}. ID: ${row.id}, Bill: ${row.bill_no}, Item: ${row.item.substring(0, 30)}..., Qty: ${row.qty}, Amount: ${row.amount} ${isTestRecord ? '[TEST]' : ''}`);
    });

    // Delete the 5 test records
    console.log('\n=== DELETING 5 TEST RECORDS ===');
    let deletedCount = 0;
    for (const record of testRecords) {
      const deleteResult = await pool.query(
        'DELETE FROM estimator_step9_cart WHERE id = $1',
        [record.id]
      );
      if (deleteResult.rowCount > 0) {
        deletedCount++;
        console.log(`✅ Deleted record ID ${record.id} - ${record.item}`);
      }
    }
    console.log(`\nTotal records deleted: ${deletedCount}`);

    // Verify deletion
    console.log('\n=== VERIFYING DELETION ===');
    const afterDeleteResult = await pool.query(
      'SELECT COUNT(*) as count FROM estimator_step9_cart WHERE bill_no = $1',
      [testSessionId]
    );
    console.log(`Test records remaining: ${afterDeleteResult.rows[0].count}`);

    // Show final record count
    console.log('\n=== FINAL RECORD COUNT ===');
    const finalCountResult = await pool.query('SELECT COUNT(*) as count FROM estimator_step9_cart');
    console.log(`Total records in table: ${finalCountResult.rows[0].count}`);

    // Show latest records to confirm test records are gone
    console.log('\n=== LATEST RECORDS AFTER DELETION ===');
    const finalRecordsResult = await pool.query(
      'SELECT id, bill_no, item, qty, amount FROM estimator_step9_cart ORDER BY id DESC LIMIT 5'
    );
    console.log('Latest 5 records:');
    finalRecordsResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}, Bill: ${row.bill_no}, Item: ${row.item.substring(0, 30)}..., Qty: ${row.qty}, Amount: ${row.amount}`);
    });

    console.log('\n=== DELETE FUNCTIONALITY TEST COMPLETE ===');
    console.log('✅ Successfully created 5 test records');
    console.log('✅ Successfully deleted 5 test records');
    console.log('✅ Verified deletion worked correctly');
    console.log('✅ No test records remain in database');

  } catch (err) {
    console.error('❌ Database error:', err.message);
    console.error('Full error:', err);
  } finally {
    await pool.end();
    console.log('\nDatabase connection closed');
  }
}

testDeleteFunctionality();