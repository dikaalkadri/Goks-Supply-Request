import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { searchParams } = new URL(req.url);

  const search       = searchParams.get('search') ?? '';
  const outlet_id    = searchParams.get('outlet_id') ?? '';
  const status       = searchParams.get('status') ?? '';
  const purchaseSt   = searchParams.get('purchase_status') ?? '';
  const hasReceipt   = searchParams.get('has_receipt') ?? '';
  const hasPhoto     = searchParams.get('has_photo') ?? '';
  const dateFrom     = searchParams.get('date_from') ?? '';
  const dateTo       = searchParams.get('date_to') ?? '';
  const page         = parseInt(searchParams.get('page') ?? '1');
  const limit        = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
  const offset       = (page - 1) * limit;

  let query = supabase
    .from('requests')
    .select(`
      *,
      outlet:outlets(id, name, code),
      request_items(*),
      request_photos(id),
      purchase_receipts(id)
    `, { count: 'exact' });

  if (outlet_id)  query = query.eq('outlet_id', outlet_id);
  if (status)     query = query.eq('status', status);
  if (purchaseSt) query = query.eq('purchase_status', purchaseSt);
  if (dateFrom)   query = query.gte('created_at', dateFrom);
  if (dateTo)     query = query.lte('created_at', dateTo + 'T23:59:59');

  if (search) {
    query = query.or(
      `request_code.ilike.%${search}%,requester_name.ilike.%${search}%`
    );
  }

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: 'Gagal memuat data.' }, { status: 500 });
  }

  let filtered = data ?? [];
  if (hasReceipt === 'yes') filtered = filtered.filter((r) => (r.purchase_receipts?.length ?? 0) > 0);
  if (hasReceipt === 'no')  filtered = filtered.filter((r) => (r.purchase_receipts?.length ?? 0) === 0);
  if (hasPhoto === 'yes')   filtered = filtered.filter((r) => (r.request_photos?.length ?? 0) > 0);
  if (hasPhoto === 'no')    filtered = filtered.filter((r) => (r.request_photos?.length ?? 0) === 0);

  return NextResponse.json({ data: filtered, total: count ?? 0, page, limit });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID diperlukan.' }, { status: 400 });

  const supabase = await createServerClient();
  const { error } = await supabase.from('requests').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Gagal menghapus permintaan.' }, { status: 500 });

  return NextResponse.json({ success: true });
}
