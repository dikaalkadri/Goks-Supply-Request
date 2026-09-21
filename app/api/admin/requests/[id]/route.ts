import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('requests')
    .select(`
      *,
      outlet:outlets(id, name, code),
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
    'status', 'purchase_status',
  ];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) updateData[field] = body[field];
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Tidak ada data yang diubah.' }, { status: 400 });
  }

  updateData.updated_at = new Date().toISOString();

  const supabase = createServerClient();
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
  const supabase = createServerClient();

  const { error } = await supabase.from('requests').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: 'Gagal menghapus permintaan.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
