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

        console.log('\n--- RECENT MATERIAL SUBMISSIONS ---');
        const submissions = await client.query('SELECT ms.*, s.name as shop_name FROM material_submissions ms LEFT JOIN shops s ON ms.shop_id = s.id ORDER BY ms.submitted_at DESC LIMIT 10');
        submissions.rows.forEach(r => {
            console.log(`ID: ${r.id}, Shop: ${r.shop_name}, Rate: ${r.rate}, Approved: ${r.approved}, Created: ${r.submitted_at}`);
        });

        console.log('\n--- RECENT MATERIALS ---');
        const materials = await client.query('SELECT m.*, s.name as shop_name FROM materials m LEFT JOIN shops s ON m.shop_id = s.id ORDER BY m.created_at DESC LIMIT 10');
        materials.rows.forEach(r => {
            console.log(`ID: ${r.id}, Shop: ${r.shop_name}, Name: ${r.name}, Approved: ${r.approved}, Created: ${r.created_at}`);
        });

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

debugData();
