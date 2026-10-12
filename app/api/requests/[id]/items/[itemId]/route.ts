import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logRequestEvent } from '@/lib/utils/request-log';

/** PATCH /api/requests/[id]/items/[itemId] - Update item (qty/nama/satuan) oleh user */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const body = await req.json();
  const { qty, item_name, unit } = body as {
    qty?: number;
    item_name?: string;
    unit?: string;
  };

  const supabase = await createAdminClient();

  const { data: request, error: reqErr } = await supabase
    .from('requests')
    .select('id, request_code, status')
    .eq('id', id)
    .single();

  if (reqErr || !request) {
    return NextResponse.json({ error: 'Permintaan tidak ditemukan.' }, { status: 404 });
  }

  if (request.status !== 'pending') {
    return NextResponse.json({ error: 'Permintaan yang sudah diproses atau selesai tidak dapat diubah.' }, { status: 400 });
  }

  const { data: currentItem, error: itemErr } = await supabase
    .from('request_items')
    .select('*')
    .eq('id', itemId)
    .eq('request_id', id)
    .single();

  if (itemErr || !currentItem) {
    return NextResponse.json({ error: 'Barang tidak ditemukan.' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  const changes: { field: string; label: string; from: string | null; to: string | null }[] = [];

  if (qty !== undefined) {
    if (qty < 1) return NextResponse.json({ error: 'Qty minimal 1.' }, { status: 400 });
    if (qty !== currentItem.qty) {
      updates.qty = qty;
      changes.push({
        field: 'item_qty',
        label: `Qty ${currentItem.item_name}`,
        from: `${currentItem.qty} ${currentItem.unit}`,
        to: `${qty} ${currentItem.unit}`,
      });
    }
  }

  if (item_name !== undefined && item_name.trim() !== '') {
    if (item_name.trim() !== currentItem.item_name) {
      updates.item_name = item_name.trim();
      changes.push({
        field: 'item_name',
        label: 'Nama Barang',
        from: currentItem.item_name,
        to: item_name.trim(),
      });
    }
  }

  if (unit !== undefined && unit.trim() !== '') {
    if (unit.trim() !== currentItem.unit) {
      updates.unit = unit.trim();
      changes.push({
        field: 'item_unit',
        label: `Satuan ${currentItem.item_name}`,
        from: currentItem.unit,
        to: unit.trim(),
      });
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ data: currentItem });
  }

  const { data: updated, error: updateErr } = await supabase
    .from('request_items')
    .update(updates)
    .eq('id', itemId)
    .eq('request_id', id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: 'Gagal memperbarui barang.' }, { status: 500 });
  }

  if (changes.length > 0) {
    await logRequestEvent({
      request_id: id,
      request_code: request.request_code,
      action: 'updated',
      actor: 'user',
      changes,
    });
  }

  return NextResponse.json({ data: updated });
}

/** DELETE /api/requests/[id]/items/[itemId] - Hapus item dari permintaan oleh user */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const supabase = await createAdminClient();

  const { data: request } = await supabase
    .from('requests')
    .select('id, request_code, status')
    .eq('id', id)
    .single();

  if (!request) {
    return NextResponse.json({ error: 'Permintaan tidak ditemukan.' }, { status: 404 });
  }

  if (request.status !== 'pending') {
    return NextResponse.json({ error: 'Permintaan yang sudah diproses atau selesai tidak dapat diubah.' }, { status: 400 });
  }

  // Cek jumlah item tersisa (tidak boleh kosongkan seluruh item)
  const { data: allItems } = await supabase
    .from('request_items')
    .select('id')
    .eq('request_id', id);

  if (allItems && allItems.length <= 1) {
    return NextResponse.json({ error: 'Permintaan harus memiliki minimal 1 barang.' }, { status: 400 });
  }

  const { data: item } = await supabase
    .from('request_items')
    .select('item_name, qty, unit')
    .eq('id', itemId)
    .eq('request_id', id)
    .single();

  if (!item) {
    return NextResponse.json({ error: 'Barang tidak ditemukan.' }, { status: 404 });
  }

  const { error } = await supabase
    .from('request_items')
    .delete()
    .eq('id', itemId)
    .eq('request_id', id);

  if (error) {
    return NextResponse.json({ error: 'Gagal menghapus barang.' }, { status: 500 });
  }

  await logRequestEvent({
    request_id: id,
    request_code: request.request_code,
    action: 'updated',
    actor: 'user',
    changes: [{ field: 'item_deleted', label: 'Barang Dihapus', from: item.item_name + ' (' + item.qty + ' ' + item.unit + ')', to: null }],
  });

  return NextResponse.json({ success: true });
}