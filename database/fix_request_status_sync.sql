-- ============================================================
-- FIX: Sinkronisasi status request utama berdasarkan status item
-- 
-- Aturan:
--   - Jika semua item != 'pending' dan ada yang 'completed'  → 'completed'
--   - Jika semua item != 'pending' dan semua 'rejected'      → 'rejected'
--   - Jika masih ada item 'pending'                          → tetap 'pending' / tidak disentuh
--
-- Hanya meng-update request yang statusnya TIDAK sinkron dengan item-itemnya.
-- Aman untuk di-run berulang kali.
-- ============================================================

WITH item_summary AS (
  SELECT
    request_id,
    COUNT(*)                                              AS total,
    COUNT(*) FILTER (WHERE status = 'pending')            AS pending_count,
    COUNT(*) FILTER (WHERE status = 'completed')          AS completed_count,
    COUNT(*) FILTER (WHERE status = 'rejected')           AS rejected_count
  FROM request_items
  GROUP BY request_id
),
computed AS (
  SELECT
    request_id,
    CASE
      WHEN pending_count = 0 AND completed_count > 0 THEN 'completed'
      WHEN pending_count = 0 AND completed_count = 0 THEN 'rejected'
      ELSE NULL  -- masih ada yang pending, tidak diubah
    END AS correct_status
  FROM item_summary
)
UPDATE requests r
SET
  status     = c.correct_status,
  updated_at = NOW()
FROM computed c
WHERE
  r.id              = c.request_id
  AND c.correct_status IS NOT NULL          -- hanya yang sudah all-reviewed
  AND r.status      != c.correct_status;   -- hanya yang perlu diubah

-- Tampilkan ringkasan hasil
SELECT
  correct_status  AS "Status Baru",
  COUNT(*)        AS "Jumlah Request Diperbarui"
FROM (
  WITH item_summary AS (
    SELECT
      request_id,
      COUNT(*) FILTER (WHERE status = 'pending')   AS pending_count,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed_count
    FROM request_items
    GROUP BY request_id
  )
  SELECT
    CASE
      WHEN pending_count = 0 AND completed_count > 0 THEN 'completed'
      WHEN pending_count = 0 AND completed_count = 0 THEN 'rejected'
    END AS correct_status
  FROM item_summary
  WHERE pending_count = 0
) sub
WHERE correct_status IS NOT NULL
GROUP BY correct_status;
