-- Add purchase_type column to request_items
-- 'warehouse' = barang dikirim dari warehouse
-- 'petty_cash' = barang dibeli dengan petty cash
-- NULL         = belum ditentukan (Menunggu) — admin menentukan nanti
ALTER TABLE request_items
  ADD COLUMN IF NOT EXISTS purchase_type VARCHAR(50)
  CHECK (purchase_type IN ('warehouse', 'petty_cash'));
