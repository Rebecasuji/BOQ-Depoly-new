const { query } = require("./server/db/client");

async function debug() {
    try {
        const res = await query("SELECT id, table_data FROM boq_items ORDER BY created_at DESC LIMIT 5");
        console.log("Found", res.rows.length, "items.");
        res.rows.forEach(row => {
            console.log("-------------------");
            console.log("ID:", row.id);
            let data = row.table_data;
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch (e) { console.log("DATA IS STRING (invalid JSON)"); }
            }
            console.log("Keys:", Object.keys(data));
            if (data.step11_items) {
                console.log("Step11 Items Count:", data.step11_items.length);
                data.step11_items.forEach((item, i) => {
                    console.log(`  Item ${i}: title=${item.title}, qty=${item.qty}`);
                });
            } else {
                console.log("NO step11_items FOUND");
            }
        });
    } catch (err) {
        console.error("Debug failed:", err);
    }
}

debug();
