import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logRequestEvent } from '@/lib/utils/request-log';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const supabase = await createAdminClient();

  const { data: request } = await supabase
    .from('requests')
    .select('id, request_code')
    .eq('id', id)
    .single();

  if (!request) {
    return NextResponse.json({ error: 'Permintaan tidak ditemukan.' }, { status: 404 });
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
    actor: 'admin',
    changes: [{ field: 'item_deleted', label: 'Barang Dihapus', from: item.item_name + ' (' + item.qty + ' ' + item.unit + ')', to: null }],
  });

  return NextResponse.json({ success: true });
}