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

        console.log('--- Checking Material Templates (Detailed) ---');
        const res = await client.query("SELECT * FROM material_templates ORDER BY created_at DESC LIMIT 20");
        console.log(`Found ${res.rowCount} templates.`);
        res.rows.forEach(r => {
            console.log(`ID: ${r.id}`);
            console.log(`Name: ${r.name}`);
            console.log(`Code: ${r.code}`);
            console.log(`Category: ${r.category}`);
            console.log(`Subcategory: ${r.subcategory}`);
            console.log(`S (sub_category): ${r.sub_category}`); // Check if this exists
            console.log('---');
        });

        const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'material_templates'`);
        console.log('Actual Columns in DB:', cols.rows.map(c => c.column_name).join(', '));

        await client.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

check();
