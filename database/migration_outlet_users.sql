-- ============================================================
-- MIGRATION: akun login outlet (role "user")
-- Run once in Supabase SQL Editor. Safe to re-run.
--
-- - Satu akun per outlet. Username awal = nama outlet tanpa nomor ("01. TAPLAU" -> "TAPLAU"),
--   password awal = 12345678.
-- - Login tidak wajib: sistem publik tetap berjalan tanpa akun.
-- - Admin tetap login dengan PIN (tabel settings), tidak berubah.
-- ============================================================

CREATE TABLE IF NOT EXISTS outlet_users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id        UUID NOT NULL UNIQUE REFERENCES outlets(id) ON DELETE CASCADE,
  username         TEXT NOT NULL,
  password_hash    TEXT NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  -- Dinaikkan saat password direset / akun dinonaktifkan -> semua sesi lama logout
  session_version  INTEGER NOT NULL DEFAULT 1,
  failed_attempts  INTEGER NOT NULL DEFAULT 0,
  locked_until     TIMESTAMPTZ,
  last_login_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Username unik tanpa membedakan huruf besar/kecil
CREATE UNIQUE INDEX IF NOT EXISTS uq_outlet_users_username ON outlet_users (lower(username));

DROP TRIGGER IF EXISTS trg_outlet_users_updated_at ON outlet_users;
CREATE TRIGGER trg_outlet_users_updated_at
  BEFORE UPDATE ON outlet_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Hanya server (service role) yang boleh mengakses. Tanpa policy = anon diblokir.
ALTER TABLE outlet_users ENABLE ROW LEVEL SECURITY;

-- Buat akun untuk setiap outlet yang belum punya akun.
-- crypt/gen_salt dari pgcrypto menghasilkan hash bcrypt ($2a$) yang dibaca bcryptjs.
INSERT INTO outlet_users (outlet_id, username, password_hash)
SELECT o.id, n.username, crypt('12345678', gen_salt('bf', 10))
FROM outlets o
CROSS JOIN LATERAL (
  SELECT COALESCE(NULLIF(btrim(regexp_replace(o.name, '^\s*\d+\s*[.)-]?\s*', '')), ''), btrim(o.name)) AS username
) n
WHERE NOT EXISTS (SELECT 1 FROM outlet_users u WHERE u.outlet_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM outlet_users u WHERE lower(u.username) = lower(n.username));
