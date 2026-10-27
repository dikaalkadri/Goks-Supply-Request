import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logRequestEvent } from '@/lib/utils/request-log';

/**
 * POST /api/admin/requests/sync-status
 *
 * Sinkronisasi status request utama berdasarkan status item-itemnya.
 * Berguna untuk memperbaiki request lama yang status utamanya belum
 * ter-update meskipun semua itemnya sudah di-review.
 *
 * Aturan:
 *   - Semua item != 'pending' & ada 'completed' → request = 'completed'
 *   - Semua item != 'pending' & semua 'rejected' → request = 'rejected'
 *   - Masih ada item 'pending'                   → tidak disentuh
 */
export async function POST() {
  const supabase = await createAdminClient();

  // Ambil semua request yang masih 'pending' atau 'processing'
  // (yang sudah 'completed'/'rejected' sudah benar, skip saja)
  const { data: candidates, error: fetchErr } = await supabase
    .from('requests')
    .select('id, request_code, status')
    .in('status', ['pending', 'processing']);

  if (fetchErr) {
    return NextResponse.json({ error: 'Gagal memuat data permintaan.' }, { status: 500 });
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ updated: 0, details: [] });
  }

  const updated: { id: string; request_code: string; from: string; to: string }[] = [];

  for (const req of candidates) {
    const { data: items, error: itemsErr } = await supabase
      .from('request_items')
      .select('status')
      .eq('request_id', req.id);

    if (itemsErr || !items || items.length === 0) continue;

    const allReviewed = items.every((i) => i.status && i.status !== 'pending');
    if (!allReviewed) continue; // masih ada yang pending, skip

    const anyCompleted = items.some((i) => i.status === 'completed');
    const correctStatus = anyCompleted ? 'completed' : 'rejected';

    if (req.status === correctStatus) continue; // sudah benar, skip

    const { error: updateErr } = await supabase
      .from('requests')
      .update({ status: correctStatus, updated_at: new Date().toISOString() })
      .eq('id', req.id);

    if (updateErr) {
      console.error(`Failed to update request ${req.id}:`, updateErr);
      continue;
    }

    await logRequestEvent({
      request_id: req.id,
      request_code: req.request_code,
      action: 'updated',
      actor: 'admin',
      changes: [{
        field: 'status',
        label: 'Status Permintaan',
        from: req.status,
        to: correctStatus,
      }],
    });

    updated.push({
      id: req.id,
      request_code: req.request_code,
      from: req.status,
      to: correctStatus,
    });
  }

  return NextResponse.json({
    updated: updated.length,
    details: updated,
  });
}
