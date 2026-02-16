import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        await client.connect();

        const total = await client.query("SELECT count(*) FROM material_templates");
        const withCat = await client.query("SELECT count(*) FROM material_templates WHERE category IS NOT NULL AND category != ''");
        const withSub = await client.query("SELECT count(*) FROM material_templates WHERE subcategory IS NOT NULL AND subcategory != ''");

        console.log(`Total Templates: ${total.rows[0].count}`);
        console.log(`With Category: ${withCat.rows[0].count}`);
        console.log(`With Subcategory: ${withSub.rows[0].count}`);

        if (withCat.rows[0].count > 0) {
            console.log('\n--- Sample with Category ---');
            const sample = await client.query("SELECT id, name, category, subcategory FROM material_templates WHERE category IS NOT NULL AND category != '' LIMIT 5");
            sample.rows.forEach(r => console.log(r));
        }

        await client.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

check();
