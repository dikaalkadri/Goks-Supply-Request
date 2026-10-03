-- ============================================================
-- MIGRATION: optional photo per request item
-- Run once in Supabase SQL Editor. Safe to re-run.
-- Photos are stored in the existing `request-condition-photos` bucket.
-- ============================================================
ALTER TABLE request_items ADD COLUMN IF NOT EXISTS photo_path TEXT;
