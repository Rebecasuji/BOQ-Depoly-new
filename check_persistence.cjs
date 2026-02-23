const { Client } = require('pg');
const client = new Client({
    connectionString: "postgresql://postgres.kfbquadkplnnqovsbnji:Durga%219Qx%407B%2325Lm@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require",
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const res = await client.query(`
      SELECT 
        m.name, 
        m.code, 
        m.technicalspecification, 
        m.shop_id, 
        s.name as shop_name,
        m.approved,
        m.created_at
      FROM materials m
      LEFT JOIN shops s ON m.shop_id = s.id
      ORDER BY m.created_at DESC
      LIMIT 10
    `);

        console.log('Last 10 Materials:');
        res.rows.forEach(row => {
            console.log(`- ${row.name} (${row.code})`);
            console.log(`  Spec: ${row.technicalspecification || 'NULL'}`);
            console.log(`  Shop: ${row.shop_name || 'NULL'} (ID: ${row.shop_id || 'NULL'})`);
            console.log(`  Approved: ${row.approved}`);
            console.log('---');
        });

        console.log('\nChecking material_templates:');
        const tplRes = await client.query(`
      SELECT name, code, technicalspecification, created_at
      FROM material_templates
      ORDER BY created_at DESC
      LIMIT 10
    `);
        tplRes.rows.forEach(row => {
            console.log(`- ${row.name} (${row.code})`);
            console.log(`  Spec: ${row.technicalspecification || 'NULL'}`);
            console.log('---');
        });

        console.log('\nSearching for ANY material with non-null specification:');
        const specRes = await client.query(`
      SELECT name, technicalspecification
      FROM materials
      WHERE technicalspecification IS NOT NULL AND technicalspecification <> ''
      LIMIT 5
    `);
        if (specRes.rows.length === 0) {
            console.log('No materials found with technical specifications.');
        } else {
            specRes.rows.forEach(row => {
                console.log(`- ${row.name}: ${row.technicalspecification}`);
            });
        }

        console.log('\nChecking shops:');
        const shopsRes = await client.query(`
      SELECT id, name
      FROM shops
      ORDER BY name ASC
      LIMIT 10
    `);
        shopsRes.rows.forEach(row => {
            console.log(`- ${row.name} (ID: ${row.id})`);
        });

        console.log('\nExact column names in materials:');
        const colsRes = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'materials'
      ORDER BY column_name
    `);
        colsRes.rows.forEach(row => {
            console.log(`- ${row.column_name}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

check();
