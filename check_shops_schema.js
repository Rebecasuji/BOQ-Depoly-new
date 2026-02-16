import pg from 'pg';
const { Pool } = pg;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
    connectionString: "postgresql://postgres.kfbquadkplnnqovsbnji:Durga%219Qx%407B%2325Lm@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require",
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'shops'
      ORDER BY ordinal_position
    `);
        console.log("\n=== Shops Table Columns ===");
        res.rows.forEach(row => {
            console.log(`${row.column_name.padEnd(25)} ${row.data_type}`);
        });
        console.log("===========================\n");
    } catch (err) {
        console.error("Verification failed:", err.message);
    } finally {
        await pool.end();
    }
}

verify();
