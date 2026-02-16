import pg from 'pg';
const { Pool } = pg;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
    connectionString: "postgresql://postgres.kfbquadkplnnqovsbnji:Durga%219Qx%407B%2325Lm@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require",
    ssl: { rejectUnauthorized: false }
});

async function inspectTable() {
    try {
        const columns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'step11_products'
        `);
        console.log("Columns in step11_products:");
        columns.rows.forEach(col => console.log(` - ${col.column_name}: ${col.data_type}`));

        const data = await pool.query('SELECT * FROM step11_products LIMIT 1');
        console.log("\nSample data:", JSON.stringify(data.rows, null, 2));
    } catch (err) {
        console.error("Failed to inspect table:", err.message);
    } finally {
        await pool.end();
    }
}

inspectTable();
