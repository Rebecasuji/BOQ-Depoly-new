import pg from 'pg';
const { Pool } = pg;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
    connectionString: "postgresql://postgres.kfbquadkplnnqovsbnji:Durga%219Qx%407B%2325Lm@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require",
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    try {
        // Check if vendor_categories table exists
        const tableCheck = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'vendor_categories'
        `);

        if (tableCheck.rows.length === 0) {
            console.log("❌ vendor_categories table DOES NOT exist");
            console.log("Creating table now...");

            await pool.query(`
                CREATE TABLE IF NOT EXISTS vendor_categories (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(255) NOT NULL UNIQUE,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);

            console.log("✅ vendor_categories table created successfully!");
        } else {
            console.log("✅ vendor_categories table EXISTS");

            // Show table structure
            const columns = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'vendor_categories'
                ORDER BY ordinal_position
            `);

            console.log("\nTable structure:");
            columns.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
            });

            // Show count of existing records
            const count = await pool.query('SELECT COUNT(*) FROM vendor_categories');
            console.log(`\nExisting records: ${count.rows[0].count}`);
        }
    } catch (err) {
        console.error("Verification failed:", err.message);
    } finally {
        await pool.end();
    }
}

verify();
