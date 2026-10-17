-- ============================================================
-- SCHEMA: Sistem Permintaan & Pembelian Barang
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: outlets
-- ============================================================
CREATE TABLE IF NOT EXISTS outlets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER,  -- urutan tampil (diatur admin), NULL = di akhir
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: outlet_users (akun login outlet, role "user")
-- Admin login tetap memakai PIN di tabel settings.
-- ============================================================
CREATE TABLE IF NOT EXISTS outlet_users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id        UUID NOT NULL UNIQUE REFERENCES outlets(id) ON DELETE CASCADE,
  username         TEXT NOT NULL,
  password_hash    TEXT NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  session_version  INTEGER NOT NULL DEFAULT 1,
  failed_attempts  INTEGER NOT NULL DEFAULT 0,
  locked_until     TIMESTAMPTZ,
  last_login_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_outlet_users_username ON outlet_users (lower(username));

-- ============================================================
-- TABLE: items (Master Barang)
-- ============================================================
CREATE TABLE IF NOT EXISTS items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  unit        TEXT NOT NULL,
  category    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: requests
-- ============================================================
CREATE TABLE IF NOT EXISTS requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code    TEXT NOT NULL UNIQUE,
  outlet_id       UUID NOT NULL REFERENCES outlets(id),
  requester_name  TEXT NOT NULL,
  note            TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','completed','rejected')),
  purchase_status TEXT NOT NULL DEFAULT 'not_purchased'
                  CHECK (purchase_status IN ('not_purchased','purchased')),
  edit_token      UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: request_items
-- ============================================================
CREATE TABLE IF NOT EXISTS request_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  item_id     UUID REFERENCES items(id),
  item_name   TEXT NOT NULL,
  unit        TEXT NOT NULL,
  qty         NUMERIC(10,2) NOT NULL CHECK (qty > 0),
  is_manual   BOOLEAN NOT NULL DEFAULT false,
  photo_path  TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','completed','rejected')),
  admin_note  TEXT,
  -- 'warehouse' = dikirim dari gudang, 'petty_cash' = dibeli outlet, NULL = belum ditentukan
  purchase_type VARCHAR(50) CHECK (purchase_type IN ('warehouse', 'petty_cash')),
  receipt_path  TEXT,          -- nota per barang
  delivered_at  TIMESTAMPTZ,   -- terisi saat nota pertama diunggah
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: request_logs (riwayat perubahan)
-- ============================================================
CREATE TABLE IF NOT EXISTS request_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID REFERENCES requests(id) ON DELETE SET NULL,
  request_code  TEXT NOT NULL,
  action        TEXT NOT NULL,
  actor         TEXT NOT NULL,
  detail        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: request_photos (foto kondisi barang)
-- ============================================================
CREATE TABLE IF NOT EXISTS request_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: purchase_receipts (nota pembelian)
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_receipts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: push_subscriptions / push_follows (notifikasi PWA)
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

-- ============================================================
-- TABLE: settings
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_requests_request_code   ON requests(request_code);
CREATE INDEX IF NOT EXISTS idx_requests_outlet_id      ON requests(outlet_id);
CREATE INDEX IF NOT EXISTS idx_requests_status         ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_purchase_status ON requests(purchase_status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at     ON requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_items_request   ON request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_request_items_item      ON request_items(item_id);
CREATE INDEX IF NOT EXISTS idx_request_photos_request  ON request_photos(request_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_req   ON purchase_receipts(request_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_request   ON request_logs(request_id, created_at DESC);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_outlet_users_updated_at
  BEFORE UPDATE ON outlet_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
