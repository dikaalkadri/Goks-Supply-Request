-- ============================================================
-- MIGRATION: admin note per item + request change history
-- Run once in Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- Catatan admin per barang (mis. alasan ditolak). Ditampilkan ke user.
ALTER TABLE request_items ADD COLUMN IF NOT EXISTS admin_note TEXT;

-- Riwayat perubahan permintaan.
-- request_id di-SET NULL saat permintaan dihapus, request_code tetap tersimpan.
CREATE TABLE IF NOT EXISTS request_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID REFERENCES requests(id) ON DELETE SET NULL,
  request_code  TEXT NOT NULL,
  action        TEXT NOT NULL,
  actor         TEXT NOT NULL,
  detail        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_logs_request ON request_logs(request_id, created_at DESC);

-- Only the server (service role) reads/writes logs. No public policy = blocked for anon.
ALTER TABLE request_logs ENABLE ROW LEVEL SECURITY;
