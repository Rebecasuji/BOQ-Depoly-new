
import pg from 'pg';
const { Pool } = pg;

const connectionString = "postgresql://postgres.kfbquadkplnnqovsbnji:Durga%219Qx%407B%2325Lm@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require";

// Explicitly Disable SSL validation for testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }          
});

async function run() {
    try {
        console.log("--- START DIAGNOSTIC ---");
        const productsRes = await pool.query("SELECT id, name FROM products WHERE name ILIKE '%demo%';");
        console.log("Products matching 'demo':", productsRes.rows);

        if (productsRes.rows.length > 0) {
            for (const p of productsRes.rows) {
                console.log(`\nChecking for Product: ${p.id} (${p.name})`);

                // Check step3 table
                const step3Res = await pool.query("SELECT id, config_name, updated_at FROM product_step3_config WHERE product_id = $1;", [p.id]);
                console.log(`- product_step3_config records (${step3Res.rows.length}):`, step3Res.rows);

                // Check step11 table (old location)
                const step11Res = await pool.query("SELECT id, product_name, updated_at FROM step11_products WHERE product_id = $1;", [p.id]);
                console.log(`- step11_products records (${step11Res.rows.length}):`, step11Res.rows);
            }    
        } else {               
            console.log("No products matching 'demo' found.");
            const sample = await pool.query("SELECT id, name FROM products LIMIT 5;");
            console.log("Sample products:", sample.rows);
        }
        console.log("\n--- END DIAGNOSTIC ---");

    } catch (err) {
        console.error("Diagnostic error:", err.message);
    } finally { 
        await pool.end();
    }
}        

run();
                                       