process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');
const connectionString = "postgresql://postgres.kfbquadkplnnqovsbnji:Durga%219Qx%407B%2325Lm@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require";

async function inspect() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'materials'
            ORDER BY ordinal_position
        `);
        console.log("Materials Table Schema:");
        res.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable})`);
        });

        const res2 = await client.query(`SELECT * FROM materials LIMIT 1`);
        if (res2.rows.length > 0) {
            console.log("\nSample Material Record Keys:");
            console.log(Object.keys(res2.rows[0]));
        } else {
            console.log("\nNo materials found in table.");
        }
    } catch (err) {
        console.error("Inspection failed:", err.message);
    } finally {
        await client.end();
        process.exit();
    }
}

inspect();
