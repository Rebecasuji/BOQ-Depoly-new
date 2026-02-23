
const { query } = require('./server/db/client.cjs'); // Wait, I need to check the path and extension
const { randomUUID } = require('crypto');

async function test() {
    const rows = [
        {
            name: "Test Material " + Date.now(),
            shop_name: "Non Existent Shop",
            technicalspecification: "Test Spec"
        }
    ];

    console.log("Testing bulk upload logic simulation...");

    for (let i = 0; i < rows.length; i++) {
        const raw = rows[i];
        const name = raw.name;
        const shop_name = raw.shop_name;

        console.log(`Processing row ${i}: ${name} with shop ${shop_name}`);

        const shopRes = await query(`SELECT id FROM shops WHERE LOWER(name) = LOWER($1) LIMIT 1`, [shop_name]);
        if (shopRes.rows.length > 0) {
            console.log("Shop found ID:", shopRes.rows[0].id);
        } else {
            console.log("ERROR: Shop not found");
        }
    }
}

test().catch(console.error);
