const { Pool } = require('pg');
require('dotenv').config();

async function showAndDeleteRecords() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await pool.connect();
    console.log('Connected to database successfully\n');

    // Show all existing records
    console.log('=== ALL EXISTING RECORDS IN STEP9 TABLE ===');
    const allRecords = await pool.query(
      'SELECT id, bill_no, s_no, item, qty, rate, amount FROM estimator_step9_cart ORDER BY id'
    );
    console.log(`Total records: ${allRecords.rows.length}`);
    console.log('All records:');
    allRecords.rows.forEach((row, index) => {
      const itemName = row.item ? row.item.substring(0, 40) + (row.item.length > 40 ? '...' : '') : 'N/A';
      console.log(`${index + 1}. ID: ${row.id}, Bill: ${row.bill_no}, S.No: ${row.s_no}, Item: ${itemName}, Qty: ${row.qty}, Rate: ${row.rate}, Amount: ${row.amount}`);
    });

    // Choose 5 records to delete (let's delete IDs 1, 2, 3, 4, 5)
    const recordsToDelete = [1, 2, 3, 4, 5];
    console.log(`\n=== DELETING 5 RECORDS: IDs ${recordsToDelete.join(', ')} ===`);

    let deletedCount = 0;
    for (const id of recordsToDelete) {
      const record = allRecords.rows.find(r => r.id === id);
      if (record) {
        const deleteResult = await pool.query(
          'DELETE FROM estimator_step9_cart WHERE id = $1',
          [id]
        );

        if (deleteResult.rowCount > 0) {
          deletedCount++;
          const itemName = record.item ? record.item.substring(0, 30) + (record.item.length > 30 ? '...' : '') : 'N/A';
          console.log(`✅ Deleted: ID ${record.id} - ${itemName}`);
        } else {
          console.log(`❌ Failed to delete: ID ${id}`);
        }
      } else {
        console.log(`❌ Record with ID ${id} not found`);
      }
    }

    console.log(`\nTotal records deleted: ${deletedCount}`);

    // Show remaining records
    console.log('\n=== REMAINING RECORDS AFTER DELETION ===');
    const remainingRecords = await pool.query(
      'SELECT id, bill_no, s_no, item, qty, rate, amount FROM estimator_step9_cart ORDER BY id'
    );
    console.log(`Remaining records: ${remainingRecords.rows.length}`);
    console.log('Remaining records:');
    remainingRecords.rows.forEach((row, index) => {
      const itemName = row.item ? row.item.substring(0, 40) + (row.item.length > 40 ? '...' : '') : 'N/A';
      console.log(`${index + 1}. ID: ${row.id}, Bill: ${row.bill_no}, S.No: ${row.s_no}, Item: ${itemName}, Qty: ${row.qty}, Rate: ${row.rate}, Amount: ${row.amount}`);
    });

    console.log('\n=== DELETION SUMMARY ===');
    console.log(`Original records: ${allRecords.rows.length}`);
    console.log(`Records deleted: ${deletedCount}`);
    console.log(`Remaining records: ${remainingRecords.rows.length}`);
    console.log(`Expected remaining: ${allRecords.rows.length - deletedCount}`);

  } catch (err) {
    console.error('❌ Database error:', err.message);
    console.error('Full error:', err);
  } finally {
    await pool.end();
    console.log('\nDatabase connection closed');
  }
}

showAndDeleteRecords();