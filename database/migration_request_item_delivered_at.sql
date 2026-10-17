-- Menambahkan kolom delivered_at pada request_items
ALTER TABLE request_items ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
