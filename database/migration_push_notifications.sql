-- ============================================================
-- MIGRATION: notifikasi push (PWA)
-- Run once in Supabase SQL Editor. Safe to re-run.
--
-- Satu baris per perangkat/browser yang mengizinkan notifikasi.
-- - outlet_id terisi  : perangkat login sebagai outlet -> dapat notifikasi
--                       semua permintaan outlet tersebut.
-- - push_follows      : perangkat (login maupun publik) mengikuti permintaan
--                       tertentu, mis. yang dikirim dari perangkat itu.
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint      TEXT NOT NULL UNIQUE,
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  outlet_id     UUID REFERENCES outlets(id) ON DELETE SET NULL,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sent_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_outlet ON push_subscriptions(outlet_id);

CREATE TABLE IF NOT EXISTS push_follows (
  subscription_id UUID NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  request_id      UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (subscription_id, request_id)
);
CREATE INDEX IF NOT EXISTS idx_push_follows_request ON push_follows(request_id);

-- Hanya server (service role) yang boleh mengakses. Tanpa policy = anon diblokir.
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_follows       ENABLE ROW LEVEL SECURITY;
