
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;

async function diagnose() {
    console.log("--- START COMPREHENSIVE DIAGNOSTIC v3 ---");
    console.log("Database URL configured:", !!connectionString);

    if (!connectionString) {
        console.error("ERROR: DATABASE_URL not found in .env");
        return;
    }

    const pool = new pg.Pool({
        connectionString,
        ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : false
    });

    try {
        const products = await pool.query("SELECT id, name, code FROM products");
        console.log(`\n[PRODUCTS TABLE: ${products.rows.length} rows]`);
        products.rows.forEach(p => {
            console.log(`PRODUCT | Name: ${p.name.padEnd(30)} | ID: ${p.id}`);
        });

        const s11 = await pool.query("SELECT id, product_id, product_name, config_name FROM step11_products");
        console.log(`\n[STEP11_PRODUCTS TABLE: ${s11.rows.length} rows]`);
        s11.rows.forEach(p => {
            console.log(`S11_CONFIG | Name: ${p.product_name.padEnd(20)} | ProductID: ${p.product_id} | Config: ${p.config_name || 'default'}`);
        });

        const items = await pool.query("SELECT count(*) as count FROM step11_product_items");
        console.log(`\n[STEP11_PRODUCT_ITEMS TABLE: ${items.rows[0].count} rows]`);

    } catch (err) {
        console.error("DIAGNOSTIC ERROR:", err);
    } finally {
        await pool.end();
        console.log("\n--- END COMPREHENSIVE DIAGNOSTIC v3 ---");
    }
}

diagnose();
