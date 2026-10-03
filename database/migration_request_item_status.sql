-- ============================================================
-- MIGRATION: status per request item
-- Run once in Supabase SQL Editor. Safe to re-run.
-- Existing items get 'pending' (Menunggu).
-- ============================================================
ALTER TABLE request_items
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'request_items_status_check'
  ) THEN
    ALTER TABLE request_items
      ADD CONSTRAINT request_items_status_check
      CHECK (status IN ('pending','completed','rejected'));
  END IF;
END $$;
