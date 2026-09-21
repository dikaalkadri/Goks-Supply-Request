-- ============================================================
-- SEED DATA
-- ============================================================

-- OUTLETS
INSERT INTO outlets (name, code, is_active) VALUES
  ('Pauh Kambar',  'PKB', true),
  ('Balai Baru',   'BBR', true),
  ('Manggung',     'MGG', true),
  ('Lubuk Lintah', 'LLT', true),
  ('Siteba',       'STB', true)
ON CONFLICT DO NOTHING;

-- MASTER BARANG
INSERT INTO items (name, unit, category, is_active) VALUES
  ('Cup 22 oz', 'box',   'Packaging',  true),
  ('Cup 16 oz', 'box',   'Packaging',  true),
  ('Sendok',    'pack',  'Peralatan',  true),
  ('Sedotan',   'pack',  'Packaging',  true),
  ('Gula',      'kg',    'Bahan Baku', true),
  ('Susu',      'liter', 'Bahan Baku', true),
  ('Plastik',   'pack',  'Packaging',  true),
  ('Tisu',      'pack',  'Peralatan',  true)
ON CONFLICT DO NOTHING;

-- ADMIN PIN DEFAULT: 123456
-- Hash di-generate dengan bcrypt rounds=12
-- Untuk update PIN, gunakan halaman /admin/settings
INSERT INTO settings (key, value) VALUES
  ('admin_pin_hash', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2QMmfCTZFa')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Catatan: Hash di atas adalah bcrypt dari "123456"
-- Segera ganti PIN setelah pertama kali login via /admin/settings
