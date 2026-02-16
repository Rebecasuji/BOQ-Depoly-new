
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const connectionString = process.env.DATABASE_URL;

async function mimic() {
    const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    let log = "";

    try {
        // 1. Find product "demo"
        log += "--- Step 1: Find product 'demo' ---\n";
        const pRes = await pool.query("SELECT * FROM products WHERE name = 'demo'");
        if (pRes.rows.length === 0) {
            log += "Product 'demo' not found!\n";
        } else {
            const p = pRes.rows[0];
            log += `Found product: id=${p.id}, name=${p.name}\n`;

            // 2. Find configurations for this ID
            log += "\n--- Step 2: Find configurations for this ID ---\n";
            const cRes = await pool.query(
                "SELECT * FROM step11_products WHERE product_id = $1 ORDER BY updated_at DESC",
                [p.id]
            );
            log += `Found ${cRes.rows.length} configurations.\n`;

            for (const config of cRes.rows) {
                log += `Config: ${config.config_name} (ID: ${config.id})\n`;
                // 3. Find items for this config
                const iRes = await pool.query(
                    "SELECT * FROM step11_product_items WHERE step11_product_id = $1",
                    [config.id]
                );
                log += `  -> Items: ${iRes.rows.length}\n`;
            }
        }

    } catch (err) {
        log += `ERROR: ${err.message}\n`;
    } finally {
        await pool.end();
        fs.writeFileSync(path.join(__dirname, '..', 'mimic_log.txt'), log);
        console.log("Mimic log written to mimic_log.txt");
        process.exit(0);
    }
}

mimic();
