
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

async function checkColumns() {
    const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    let log = "--- Table Columns Check ---\n";

    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'step11_product_items'
      ORDER BY ordinal_position
    `);

        res.rows.forEach(row => {
            log += `${row.column_name}: ${row.data_type}\n`;
        });

    } catch (err) {
        log += `ERROR: ${err.message}\n`;
    } finally {
        await pool.end();
        fs.writeFileSync(path.join(__dirname, '..', 'columns_log.txt'), log);
        console.log("Columns log written to columns_log.txt");
        process.exit(0);
    }
}

checkColumns();
