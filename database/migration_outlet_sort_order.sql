-- ============================================================
-- MIGRATION: urutan outlet yang bisa diatur admin (drag & drop)
-- Run once in Supabase SQL Editor. Safe to re-run.
--
-- Urutan awal = urutan nama seperti sekarang, jadi tampilan tidak berubah
-- sampai admin menggeser outlet di menu Outlet.
-- ============================================================
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS sort_order INTEGER;

UPDATE outlets o
SET sort_order = s.rn
FROM (SELECT id, row_number() OVER (ORDER BY name) AS rn FROM outlets) s
WHERE o.id = s.id AND o.sort_order IS NULL;

CREATE INDEX IF NOT EXISTS idx_outlets_sort_order ON outlets(sort_order);
