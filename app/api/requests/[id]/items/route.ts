import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logRequestEvent } from '@/lib/utils/request-log';

/** POST /api/requests/[id]/items - Tambah item ke permintaan oleh user */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { item_id, item_name, unit, qty, is_manual } = body as {
    item_id?: string | null;
    item_name: string;
    unit: string;
    qty: number;
    is_manual: boolean;
  };

  if (!item_name?.trim()) return NextResponse.json({ error: 'Nama barang wajib diisi.' }, { status: 400 });
  if (!unit?.trim()) return NextResponse.json({ error: 'Satuan wajib diisi.' }, { status: 400 });
  if (!qty || qty < 1) return NextResponse.json({ error: 'Qty minimal 1.' }, { status: 400 });

  const supabase = await createAdminClient();

  // Pastikan request ada dan masih pending (hanya boleh edit saat pending)
  const { data: request, error: reqErr } = await supabase
    .from('requests')
    .select('id, request_code, status, requester_name')
    .eq('id', id)
    .single();

  if (reqErr || !request) {
    return NextResponse.json({ error: 'Permintaan tidak ditemukan.' }, { status: 404 });
  }

  if (request.status !== 'pending') {
    return NextResponse.json({ error: 'Permintaan yang sudah diproses atau selesai tidak dapat diubah.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('request_items')
    .insert({
      request_id: id,
      item_id: item_id || null,
      item_name: item_name.trim(),
      unit: unit.trim(),
      qty,
      is_manual: is_manual ?? true,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Gagal menambah barang.' }, { status: 500 });
  }

  await logRequestEvent({
    request_id: id,
    request_code: request.request_code,
    action: 'updated',
    actor: 'user',
    changes: [{ field: 'item_added', label: 'Barang Ditambahkan', from: null, to: item_name.trim() + ' (' + qty + ' ' + unit.trim() + ')' }],
  });

  return NextResponse.json({ data }, { status: 201 });
}