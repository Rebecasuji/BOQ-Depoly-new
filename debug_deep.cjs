
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

async function debugData() {
    const client = new Client({
        connectionString: "postgresql://postgres.kfbquadkplnnqovsbnji:Durga%219Qx%407B%2325Lm@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require",
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        console.log('\n--- CATEGORIES ---');
        const categories = await client.query('SELECT * FROM material_categories LIMIT 5');
        categories.rows.forEach(r => console.log(`ID: ${r.id}, Name: ${r.name}`));

        console.log('\n--- SUBCATEGORIES ---');
        const subcats = await client.query('SELECT * FROM material_subcategories LIMIT 5');
        subcats.rows.forEach(r => console.log(`ID: ${r.id}, Name: ${r.name}, Category: ${r.category}`));

        console.log('\n--- RECENT MATERIAL (hbfhgf) ---');
        const mat = await client.query("SELECT * FROM materials WHERE name = 'hbfhgf' ORDER BY created_at DESC LIMIT 1");
        if (mat.rows.length > 0) {
            console.log(JSON.stringify(mat.rows[0], null, 2));
        } else {
            console.log("Material 'hbfhgf' not found.");
        }

        console.log('\n--- PENDING SUBMISSIONS ---');
        const pending = await client.query('SELECT COUNT(*) FROM material_submissions WHERE approved IS NULL');
        console.log(`Count: ${pending.rows[0].count}`);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

debugData();
