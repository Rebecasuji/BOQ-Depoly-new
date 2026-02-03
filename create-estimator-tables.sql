-- Create estimator tables for door estimator Create BOQ functionality

CREATE TABLE IF NOT EXISTS estimator_step9_cart (
  id SERIAL PRIMARY KEY,
  estimator VARCHAR(50) NOT NULL,
  bill_no VARCHAR(100) NOT NULL,
  batch_id VARCHAR(100),
  row_id VARCHAR(100),
  door_type VARCHAR(100),
  panel_type VARCHAR(100),
  sub_option VARCHAR(100),
  glazing_type VARCHAR(100),
  qty INTEGER,
  height DECIMAL,
  width DECIMAL,
  glass_height DECIMAL,
  glass_width DECIMAL,
  material_id VARCHAR(100),
  name VARCHAR(255),
  unit VARCHAR(50),
  quantity DECIMAL,
  supply_rate DECIMAL,
  install_rate DECIMAL,
  shop_id VARCHAR(100),
  shop_name VARCHAR(255),
  description TEXT,
  location VARCHAR(255),
  subtotal DECIMAL,
  sgst DECIMAL,
  cgst DECIMAL,
  round_off DECIMAL,
  grand_total DECIMAL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estimator_step11_finalize_boq (
  id SERIAL PRIMARY KEY,
  estimator VARCHAR(50) NOT NULL,
  bill_no VARCHAR(100) NOT NULL,
  group_key VARCHAR(255),
  group_id VARCHAR(100),
  item_name VARCHAR(255),
  unit VARCHAR(50),
  quantity DECIMAL,
  location VARCHAR(255),
  description TEXT,
  supply_rate DECIMAL,
  install_rate DECIMAL,
  supply_amount DECIMAL,
  install_amount DECIMAL,
  supply_subtotal DECIMAL,
  install_subtotal DECIMAL,
  sgst DECIMAL,
  cgst DECIMAL,
  round_off DECIMAL,
  grand_total DECIMAL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estimator_step12_qa_boq (
  id SERIAL PRIMARY KEY,
  estimator VARCHAR(50) NOT NULL,
  bill_no VARCHAR(100) NOT NULL,
  selected_group_ids JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_estimator_step9_cart_bill_no ON estimator_step9_cart(bill_no);
CREATE INDEX IF NOT EXISTS idx_estimator_step9_cart_estimator ON estimator_step9_cart(estimator);

CREATE INDEX IF NOT EXISTS idx_estimator_step11_finalize_boq_bill_no ON estimator_step11_finalize_boq(bill_no);
CREATE INDEX IF NOT EXISTS idx_estimator_step11_finalize_boq_estimator ON estimator_step11_finalize_boq(estimator);

CREATE INDEX IF NOT EXISTS idx_estimator_step12_qa_boq_bill_no ON estimator_step12_qa_boq(bill_no);
CREATE INDEX IF NOT EXISTS idx_estimator_step12_qa_boq_estimator ON estimator_step12_qa_boq(estimator);