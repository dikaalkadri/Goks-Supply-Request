-- ============================================================
-- MIGRATION: admin push subscriptions
-- Adds is_admin flag to push_subscriptions so that admin
-- devices can be notified separately from outlet devices.
-- Run once on the production database.
-- ============================================================

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_admin ON push_subscriptions(is_admin) WHERE is_admin = true;
