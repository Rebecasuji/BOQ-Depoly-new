-- Create estimator tables with exact specifications

-- 1) Table for Step 9 (cart / saved materials)
CREATE TABLE IF NOT EXISTS estimator_step9_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimator TEXT NOT NULL,
  session_id TEXT NOT NULL,
  batch_id TEXT,
  row_id TEXT,
  bill_no TEXT,
  door_type TEXT,
  panel_type TEXT,
  sub_option TEXT,
  glazing_type TEXT,
  qty NUMERIC,
  height NUMERIC,
  width NUMERIC,
  glass_height NUMERIC,
  glass_width NUMERIC,
  material_id UUID,
  name TEXT,
  unit TEXT,
  quantity NUMERIC,
  supply_rate NUMERIC,
  install_rate NUMERIC,
  shop_id UUID,
  shop_name TEXT,
  description TEXT,
  location TEXT,
  subtotal NUMERIC,
  sgst NUMERIC,
  cgst NUMERIC,
  round_off NUMERIC,
  grand_total NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2) Table for Step 11 (finalize BOQ grouped lines)
CREATE TABLE IF NOT EXISTS estimator_step11_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimator TEXT NOT NULL,
  session_id TEXT NOT NULL,
  group_key TEXT,
  group_id TEXT,
  item_name TEXT,
  unit TEXT,
  quantity NUMERIC,
  location TEXT,
  description TEXT,
  supply_rate NUMERIC,
  install_rate NUMERIC,
  supply_amount NUMERIC,
  install_amount NUMERIC,
  supply_subtotal NUMERIC,
  install_subtotal NUMERIC,
  sgst NUMERIC,
  cgst NUMERIC,
  round_off NUMERIC,
  grand_total NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3) Table for Step 12 (QA selection)
CREATE TABLE IF NOT EXISTS estimator_step12_qa_selection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimator TEXT NOT NULL,
  session_id TEXT NOT NULL,
  selected_group_ids JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_estimator_step9_items_session_estimator ON estimator_step9_items (session_id, estimator);
CREATE INDEX IF NOT EXISTS idx_estimator_step11_groups_session_estimator ON estimator_step11_groups (session_id, estimator);
CREATE INDEX IF NOT EXISTS idx_estimator_step12_qa_selection_session_estimator ON estimator_step12_qa_selection (session_id, estimator);