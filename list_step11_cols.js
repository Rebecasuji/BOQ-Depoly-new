import pg from 'pg';
const { Pool } = pg;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
    connectionString: "postgresql://postgres.kfbquadkplnnqovsbnji:Durga%219Qx%407B%2325Lm@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require",
    ssl: { rejectUnauthorized: false }
});

async function inspectTable() {
    try {
        const tables = ['step11_products', 'step11_product_items'];
        for (const table of tables) {
            const columns = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '${table}'
            `);
            console.log(`Columns in ${table}:`);
            columns.rows.forEach(col => console.log(` - ${col.column_name}: ${col.data_type}`));
            console.log("-------------------");
        }
    } catch (err) {
        console.error("Failed to inspect table:", err.message);
    } finally {
        await pool.end();
    }
}

inspectTable();
