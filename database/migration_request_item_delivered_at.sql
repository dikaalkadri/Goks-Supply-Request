-- Menambahkan kolom delivered_at pada request_items
ALTER TABLE request_items ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;
