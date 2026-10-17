-- ============================================================
-- MIGRATION: username akun outlet tanpa nomor ("01. TAPLAU" -> "TAPLAU")
-- Run once in Supabase SQL Editor after migration_outlet_users.sql. Safe to re-run.
--
-- Hanya mengubah akun yang username-nya masih sama dengan nama outlet
-- (username yang sudah diubah manual oleh admin tidak disentuh).
-- Password dan sesi login tidak berubah.
-- ============================================================
UPDATE outlet_users u
SET username = n.username
FROM outlets o
CROSS JOIN LATERAL (
  SELECT COALESCE(NULLIF(btrim(regexp_replace(o.name, '^\s*\d+\s*[.)-]?\s*', '')), ''), btrim(o.name)) AS username
) n
WHERE u.outlet_id = o.id
  AND u.username = o.name
  AND n.username <> u.username
  AND NOT EXISTS (
    SELECT 1 FROM outlet_users other
    WHERE other.id <> u.id AND lower(other.username) = lower(n.username)
  );
