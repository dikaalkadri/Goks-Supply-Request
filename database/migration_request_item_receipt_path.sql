-- Add receipt_path to request_items for per-item receipts
ALTER TABLE request_items ADD COLUMN receipt_path text;
