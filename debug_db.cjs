
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkData() {
    try {
        console.log("Checking products...");
        const productsRes = await pool.query("SELECT id, name FROM products WHERE name ILIKE '%GRID CEILING%'");
        console.log("Products found:", productsRes.rows);

        console.log("Checking snapshots...");
        const snapshotsRes = await pool.query("SELECT id, product_id, product_name, grand_total_amount FROM product_boq_snapshots");
        console.log("Snapshots found:", snapshotsRes.rows);

        if (productsRes.rows.length === 0 && snapshotsRes.rows.length > 0) {
            console.log("Snapshots exist but product not found by name filter. Listing first snapshot details:");
            console.log(snapshotsRes.rows[0]);
        }

    } catch (err) {
        console.error("Error checking data:", err);
    } finally {
        await pool.end();
    }
}

checkData();
