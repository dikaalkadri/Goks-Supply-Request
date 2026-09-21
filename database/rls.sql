-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE outlets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_photos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- OUTLETS: public can read active, admin (service role) can ALL
-- ============================================================
CREATE POLICY "public_read_active_outlets"
  ON outlets FOR SELECT
  USING (is_active = true);

-- ============================================================
-- ITEMS: public can read active, admin can ALL
-- ============================================================
CREATE POLICY "public_read_active_items"
  ON items FOR SELECT
  USING (is_active = true);

-- ============================================================
-- REQUESTS: 
--   - public can INSERT
--   - public can SELECT (all, for public view)
--   - public can UPDATE only purchase_status & updated_at with valid edit_token
--     (validated via API route server-side, not directly via RLS)
-- ============================================================
CREATE POLICY "public_insert_requests"
  ON requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "public_select_requests"
  ON requests FOR SELECT
  USING (true);

-- Note: UPDATE for public is handled server-side via service role key
-- to validate edit_token. Direct client UPDATE is blocked.

-- ============================================================
-- REQUEST_ITEMS:
--   - public can INSERT (when creating request)
--   - public can SELECT
-- ============================================================
CREATE POLICY "public_insert_request_items"
  ON request_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "public_select_request_items"
  ON request_items FOR SELECT
  USING (true);

-- ============================================================
-- REQUEST_PHOTOS:
--   - public can INSERT
--   - public can SELECT
-- ============================================================
CREATE POLICY "public_insert_request_photos"
  ON request_photos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "public_select_request_photos"
  ON request_photos FOR SELECT
  USING (true);

-- ============================================================
-- PURCHASE_RECEIPTS:
--   - public can SELECT
--   - INSERT handled server-side (with edit_token validation)
-- ============================================================
CREATE POLICY "public_select_purchase_receipts"
  ON purchase_receipts FOR SELECT
  USING (true);

-- INSERT via server-side only (service role)

-- ============================================================
-- SETTINGS: only service role can access
-- (No public policy = blocked for anon)
-- ============================================================

-- ============================================================
-- STORAGE POLICIES (run in Supabase Storage UI or SQL)
-- ============================================================
-- Bucket: request-condition-photos (public read, authenticated upload)
-- Bucket: request-receipts (public read, authenticated upload)
--
-- Both buckets: INSERT via signed URL (server-side generated)
-- Both buckets: SELECT public (to display images)
