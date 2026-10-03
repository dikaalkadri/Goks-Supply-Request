import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sanitizeSearch, mediaFilterSelect, applyMediaFilters } from '@/lib/utils/request-query';
import { logRequestEvent } from '@/lib/utils/request-log';

export async function GET(req: NextRequest) {
  const supabase = await createAdminClient();
  const { searchParams } = new URL(req.url);

  const search       = sanitizeSearch(searchParams.get('search') ?? '');
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
      outlet:outlets(id, name),
      request_items(*),
      request_photos(id),
      purchase_receipts(id)
      ${mediaFilterSelect(hasPhoto)}
    `, { count: 'exact' });

  query = applyMediaFilters(query, hasReceipt, hasPhoto);

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

  // `ph` is only the has_photo filter helper join
  const rows = ((data ?? []) as unknown as Record<string, unknown>[]).map(({ ph: _ph, ...rest }) => rest);

  return NextResponse.json({ data: rows, total: count ?? 0, page, limit });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID diperlukan.' }, { status: 400 });

  const supabase = await createAdminClient();
  const { data: existing } = await supabase.from('requests').select('request_code').eq('id', id).single();
  const { error } = await supabase.from('requests').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Gagal menghapus permintaan.' }, { status: 500 });

  if (existing) {
    await logRequestEvent({ request_id: null, request_code: existing.request_code, action: 'deleted', actor: 'admin' });
  }

  return NextResponse.json({ success: true });
}
