import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// Public: update purchase_status with valid edit_token
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { purchase_status, edit_token } = body as {
    purchase_status: string;
    edit_token: string;
  };

  if (!purchase_status || !['not_purchased', 'purchased'].includes(purchase_status)) {
    return NextResponse.json({ error: 'Status pembelian tidak valid.' }, { status: 400 });
  }
  if (!edit_token) {
    return NextResponse.json({ error: 'Token tidak valid.' }, { status: 403 });
  }

  const supabase = createServerClient();

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
    return NextResponse.json({ error: 'Anda tidak memiliki akses untuk mengubah permintaan ini.' }, { status: 403 });
  }

  const { error: updateErr } = await supabase
    .from('requests')
    .update({ purchase_status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (updateErr) {
    return NextResponse.json({ error: 'Gagal memperbarui status pembelian.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
