
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// NUCLEAR OPTION for SSL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const connectionString = process.env.DATABASE_URL;

async function diagnose() {
    let output = "--- COMPREHENSIVE DIAGNOSTIC v4 (AGGRESSIVE SSL BYPASS) ---\n";

    if (!connectionString) {
        fs.writeFileSync(path.join(__dirname, '..', 'diag_v4.txt'), "ERROR: DATABASE_URL not found");
        return;
    }

    const pool = new pg.Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        const products = await pool.query("SELECT id, name FROM products");
        output += `\nPRODUCTS (${products.rows.length}):\n`;
        products.rows.forEach(p => {
            output += `${p.name} | ${p.id}\n`;
        });

        const s11 = await pool.query("SELECT product_id, product_name, config_name FROM step11_products");
        output += `\nSTEP11 CONFIGS (${s11.rows.length}):\n`;
        s11.rows.forEach(p => {
            output += `${p.product_name} | ${p.product_id} | ${p.config_name}\n`;
        });

    } catch (err) {
        output += `\nERROR: ${err.message}\n`;
        output += `\nSTACK: ${err.stack}\n`;
    } finally {
        await pool.end();
        output += "\n--- END ---\n";
        fs.writeFileSync(path.join(__dirname, '..', 'diag_v4.txt'), output);
        process.exit(0);
    }
}

diagnose();
