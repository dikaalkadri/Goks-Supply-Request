import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logRequestEvent } from '@/lib/utils/request-log';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { storage_path, type, request_item_id } = body as {
    storage_path: string;
    type: 'photo' | 'receipt' | 'item_photo' | 'item_receipt';
    request_item_id?: string;
  };

  if (!storage_path || !type || ((type === 'item_photo' || type === 'item_receipt') && !request_item_id)) {
    return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 });
  }

  const supabase = await createAdminClient();

  // Verify the request exists (anyone with the link can upload)
  const { data: existing, error: fetchErr } = await supabase
    .from('requests')
    .select('id')
    .eq('id', id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Permintaan tidak ditemukan.' }, { status: 404 });
  }

  if (type === 'item_photo' || type === 'item_receipt') {
    // For receipt upload, check if delivered_at is already set
    let updatePayload: any = type === 'item_photo' ? { photo_path: storage_path } : { receipt_path: storage_path };

    let itemWasAutoCompleted = false;

    if (type === 'item_receipt') {
      const { data: itemData, error: itemErr } = await supabase
        .from('request_items')
        .select('delivered_at, purchase_type, status')
        .eq('id', request_item_id)
        .single();
      
      if (!itemErr && itemData) {
        // Set delivered_at only on first upload
        if (!itemData.delivered_at) {
          updatePayload.delivered_at = new Date().toISOString();
        }
        // Auto-complete status for petty_cash on first nota upload
        if (itemData.purchase_type === 'petty_cash' && itemData.status !== 'completed') {
          updatePayload.status = 'completed';
          itemWasAutoCompleted = true;
        }
      }
    }

    const { data: updated, error } = await supabase
      .from('request_items')
      .update(updatePayload)
      .eq('id', request_item_id)
      .eq('request_id', id)
      .select('id');

    if (error) {
      return NextResponse.json({ error: 'Gagal menyimpan file.' }, { status: 500 });
    }
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'Barang tidak ditemukan.' }, { status: 404 });
    }

    // If item was auto-completed via nota upload, check if request can be auto-completed too
    if (itemWasAutoCompleted) {
      const { data: reqData } = await supabase
        .from('requests')
        .select('request_code, status')
        .eq('id', id)
        .single();

      const { data: allItems } = await supabase
        .from('request_items')
        .select('status')
        .eq('request_id', id);

      if (allItems && allItems.length > 0) {
        const allReviewed = allItems.every((i) => i.status && i.status !== 'pending');
        if (allReviewed) {
          const anyCompleted = allItems.some((i) => i.status === 'completed');
          const newRequestStatus = anyCompleted ? 'completed' : 'rejected';

          if (reqData && reqData.status !== newRequestStatus) {
            await supabase
              .from('requests')
              .update({ status: newRequestStatus, updated_at: new Date().toISOString() })
              .eq('id', id);

            await logRequestEvent({
              request_id: id,
              request_code: reqData.request_code,
              action: 'updated',
              actor: 'user',
              changes: [{
                field: 'status',
                label: 'Status Permintaan',
                from: reqData.status,
                to: newRequestStatus,
              }],
            });
          }
        }
      }
    }
  } else if (type === 'photo') {
    // Check max 3 photos
    const { count } = await supabase
      .from('request_photos')
      .select('id', { count: 'exact' })
      .eq('request_id', id);

    if ((count ?? 0) >= 3) {
      return NextResponse.json({ error: 'Maksimal 3 foto kondisi per permintaan.' }, { status: 400 });
    }

    const { error } = await supabase.from('request_photos').insert({
      request_id: id,
      storage_path,
    });

    if (error) {
      return NextResponse.json({ error: 'Gagal menyimpan foto.' }, { status: 500 });
    }
  } else {
    // Check max 3 receipts
    const { count } = await supabase
      .from('purchase_receipts')
      .select('id', { count: 'exact' })
      .eq('request_id', id);

    if ((count ?? 0) >= 3) {
      return NextResponse.json({ error: 'Maksimal 3 nota per permintaan.' }, { status: 400 });
    }

    const { error } = await supabase.from('purchase_receipts').insert({
      request_id: id,
      storage_path,
    });

    if (error) {
      return NextResponse.json({ error: 'Gagal menyimpan nota.' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
