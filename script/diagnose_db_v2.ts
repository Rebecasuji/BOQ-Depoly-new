
import { query } from "../server/db/client";

async function diagnose() {
    console.log("--- START COMPREHENSIVE DIAGNOSTIC ---");
    try {
        const products = await query("SELECT id, name, code FROM products");
        console.log(`\n[TOTAL PRODUCTS: ${products.rows.length}]`);
        products.rows.forEach(p => {
            console.log(`PRODUCT -> Name: ${p.name.padEnd(20)} | ID: ${p.id} | Code: ${p.code}`);
        });

        const s11 = await query("SELECT id, product_id, product_name, config_name FROM step11_products");
        console.log(`\n[TOTAL STEP 11 CONFIGS: ${s11.rows.length}]`);
        s11.rows.forEach(p => {
            console.log(`CONFIG  -> Product: ${p.product_name.padEnd(15)} | ProductID: ${p.product_id} | ConfigName: ${p.config_name} | ID: ${p.id}`);
        });

        // Check for any mismatches
        console.log("\n[Checking for orphaned Step 11 configs...]");
        const orphans = await query(`
      SELECT s.id, s.product_name, s.product_id 
      FROM step11_products s
      LEFT JOIN products p ON s.product_id = p.id
      WHERE p.id IS NULL
    `);
        if (orphans.rows.length > 0) {
            console.log(`Found ${orphans.rows.length} orphaned configurations!`);
            orphans.rows.forEach(o => {
                console.log(`ORPHAN -> ConfigID: ${o.id} | ProductName: ${o.product_name} | ProductID in Config: ${o.product_id}`);
            });
        } else {
            console.log("No orphaned configurations found.");
        }

    } catch (err) {
        console.error("DIAGNOSTIC ERROR:", err);
    } finally {
        console.log("--- END COMPREHENSIVE DIAGNOSTIC ---");
        process.exit(0);
    }
}
diagnose();
