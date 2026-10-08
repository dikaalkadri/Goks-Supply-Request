import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { storage_path, edit_token, type, request_item_id } = body as {
    storage_path: string;
    edit_token: string;
    type: 'photo' | 'receipt' | 'item_photo' | 'item_receipt';
    request_item_id?: string;
  };

  if (!storage_path || !edit_token || !type || ((type === 'item_photo' || type === 'item_receipt') && !request_item_id)) {
    return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 });
  }

  const supabase = await createAdminClient();

  // Verify edit_token
  const { data: existing, error: fetchErr } = await supabase
    .from('requests')
    .select('id, edit_token')
    .eq('id', id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Permintaan tidak ditemukan.' }, { status: 404 });
  }
  if (existing.edit_token !== edit_token) {
    return NextResponse.json({ error: 'Anda tidak memiliki akses.' }, { status: 403 });
  }

  if (type === 'item_photo' || type === 'item_receipt') {
    // For receipt upload, check if delivered_at is already set
    let updatePayload: any = type === 'item_photo' ? { photo_path: storage_path } : { receipt_path: storage_path };

    if (type === 'item_receipt') {
      const { data: itemData, error: itemErr } = await supabase
        .from('request_items')
        .select('delivered_at')
        .eq('id', request_item_id)
        .single();
      
      if (!itemErr && itemData && !itemData.delivered_at) {
        updatePayload.delivered_at = new Date().toISOString();
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
