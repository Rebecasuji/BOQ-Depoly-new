const { Pool } = require('pg');

(async () => {
  try {
    const connectionString = process.env.DATABASE_URL || 'postgres://boq_admin:boq_admin_pass@localhost:5432/boq';
    const pool = new Pool({ connectionString });
    console.log('[script] Connecting to DB:', connectionString.includes('supabase') ? 'SUPABASE' : 'LOCAL');

    // Ensure table exists (simple schema match for test)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS estimator_step9_cart (
        id SERIAL PRIMARY KEY,
        estimator VARCHAR(50) NOT NULL,
        bill_no VARCHAR(100) NOT NULL,
        s_no INTEGER,
        item VARCHAR(255),
        description TEXT,
        unit VARCHAR(50),
        qty DECIMAL,
        rate DECIMAL,
        amount DECIMAL,
        material_id UUID,
        batch_id TEXT,
        row_id TEXT,
        shop_id UUID,
        supply_rate DECIMAL,
        install_rate DECIMAL,
        door_type TEXT,
        panel_type TEXT,
        sub_option TEXT,
        glazing_type TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const billNo = `TEST-BILL-${Date.now()}`;
    const res = await pool.query(
      `INSERT INTO estimator_step9_cart (estimator, bill_no, s_no, item, description, unit, qty, rate, amount) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      ['doors', billNo, 1, 'Test Item', 'Inserted by script', 'pcs', 2, 100, 200]
    );

    console.log('[script] Inserted row:', res.rows[0]);

    const sel = await pool.query(`SELECT * FROM estimator_step9_cart WHERE bill_no = $1 ORDER BY created_at DESC`, [billNo]);
    console.log('[script] Rows for', billNo, sel.rows);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('[script] Error:', err);
    process.exit(1);
  }
})();
