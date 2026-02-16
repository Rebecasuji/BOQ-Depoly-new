
import { query } from "../server/db/client";

async function diagnose() {
    console.log("--- Diagnostic Script Start ---");
    try {
        // 1. Check all product configs
        const products = await query("SELECT * FROM step11_products");
        console.log(`Total product configurations found: ${products.rows.length}`);

        products.rows.forEach(p => {
            console.log(`[CONFIG] ID: ${p.id} | ProductID: ${p.product_id} | Name: ${p.product_name} | ConfigName: ${p.config_name}`);
        });

        // 2. Check all items
        const items = await query("SELECT count(*) as count FROM step11_product_items");
        console.log(`Total items found across all configs: ${items.rows[0].count}`);

        // 3. Specifically search for "demo"
        console.log("\nSearching specifically for 'demo' products...");
        const demoSearch = await query("SELECT * FROM step11_products WHERE product_name ILIKE '%demo%'");
        if (demoSearch.rows.length === 0) {
            console.log("No configurations found with name containing 'demo'.");
        } else {
            demoSearch.rows.forEach(p => {
                console.log(`MATCH -> ID: ${p.id} | ProductID: ${p.product_id} | Name: ${p.product_name}`);
            });
        }

        // 4. Check for any product where items are missing
        console.log("\nChecking for empty configurations (no items)...");
        const emptyConfigs = await query(`
      SELECT p.id, p.product_name 
      FROM step11_products p
      LEFT JOIN step11_product_items i ON p.id = i.step11_product_id
      WHERE i.id IS NULL
    `);
        console.log(`Found ${emptyConfigs.rows.length} configurations with no items.`);
        emptyConfigs.rows.forEach(p => {
            console.log(`EMPTY -> ID: ${p.id} | Name: ${p.product_name}`);
        });

    } catch (err) {
        console.error("Diagnostic failed:", err);
    } finally {
        console.log("--- Diagnostic Script End ---");
        process.exit(0);
    }
}

diagnose();
