import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('requests')
    .select(`
      *,
      outlet:outlets(id, name),
      request_items(*),
      request_photos(*),
      purchase_receipts(*)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Permintaan tidak ditemukan.' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const allowedFields = [
    'outlet_id', 'requester_name', 'note',
    'purchase_status',
  ];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) updateData[field] = body[field];
  }

  // Optional per-item status changes: [{ id, status }]
  const itemStatuses = Array.isArray(body.items)
    ? (body.items as { id: string; status: string }[])
    : [];
  const validItemStatuses = ['pending', 'completed', 'rejected'];
  if (itemStatuses.some((i) => !i?.id || !validItemStatuses.includes(i.status))) {
    return NextResponse.json({ error: 'Status barang tidak valid.' }, { status: 400 });
  }

  if (Object.keys(updateData).length === 0 && itemStatuses.length === 0) {
    return NextResponse.json({ error: 'Tidak ada data yang diubah.' }, { status: 400 });
  }

  updateData.updated_at = new Date().toISOString();

  const supabase = await createAdminClient();

  for (const item of itemStatuses) {
    const { error: itemErr } = await supabase
      .from('request_items')
      .update({ status: item.status })
      .eq('id', item.id)
      .eq('request_id', id);
    if (itemErr) {
      console.error('Update item status error:', itemErr);
      return NextResponse.json({ error: 'Gagal memperbarui status barang.' }, { status: 500 });
    }
  }

  // Request status follows its items: 'completed' (Selesai) once every item
  // has been reviewed by admin, otherwise 'pending' (Menunggu).
  const { data: items, error: itemsErr } = await supabase
    .from('request_items')
    .select('status')
    .eq('request_id', id);
  if (!itemsErr && items && items.length > 0) {
    const allReviewed = items.every((i) => i.status && i.status !== 'pending');
    updateData.status = allReviewed ? 'completed' : 'pending';
  }

  const { data, error } = await supabase
    .from('requests')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Gagal memperbarui permintaan.' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createAdminClient();

  const { error } = await supabase.from('requests').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: 'Gagal menghapus permintaan.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
