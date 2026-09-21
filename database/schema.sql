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
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
