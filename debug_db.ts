import pg from 'pg';
import "dotenv/config";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = pg;

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

        if (productsRes.rows.length > 0) {
            const productId = productsRes.rows[0].id;
            console.log(`Checking snapshot for specific product ID: ${productId}`);
            const specificSnapshot = await pool.query("SELECT * FROM product_boq_snapshots WHERE product_id = $1", [productId]);
            console.log("Specific snapshot:", specificSnapshot.rows);
        }

    } catch (err) {
        console.error("Error checking data:", err);
    } finally {
        await pool.end();
    }
}

checkData();
