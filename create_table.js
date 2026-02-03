import { query } from "./server/db/client.js";

async function createTable() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS estimator_step9_cart (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        estimator TEXT NOT NULL,
        bill_no TEXT NOT NULL,
        s_no INTEGER,
        item TEXT,
        description TEXT,
        unit TEXT,
        qty DECIMAL(10,2),
        rate DECIMAL(10,2),
        amount DECIMAL(10,2),
        material_id UUID,
        batch_id TEXT,
        row_id TEXT,
        shop_id UUID,
        supply_rate DECIMAL(10,2),
        install_rate DECIMAL(10,2),
        door_type TEXT,
        panel_type TEXT,
        sub_option TEXT,
        glazing_type TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `;

    await query(sql);
    console.log("Table created successfully");
  } catch (error) {
    console.error("Error creating table:", error);
  }
}

createTable();