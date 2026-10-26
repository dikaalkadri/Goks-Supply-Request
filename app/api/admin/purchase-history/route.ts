import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { startOfDayWIB, endOfDayWIB, dateWIB } from '@/lib/utils/date-range';

export async function GET(req: NextRequest) {
  const supabase = await createAdminClient();
  const { searchParams } = new URL(req.url);

  const outletId    = searchParams.get('outlet_id')    ?? '';
  const dateFrom    = searchParams.get('date_from')    ?? '';
  const dateTo      = searchParams.get('date_to')      ?? '';
  const purchaseType = searchParams.get('purchase_type') ?? '';
  const itemStatus  = searchParams.get('item_status')  ?? '';
  const itemSource  = searchParams.get('item_source')  ?? ''; // 'master' | 'manual'
  const search      = searchParams.get('search')       ?? '';
  const page        = parseInt(searchParams.get('page') ?? '1');
  const limit       = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
  const offset      = (page - 1) * limit;

  let query: any = supabase
    .from('request_items')
    .select(`
      id,
      item_id,
      item_name,
      qty,
      unit,
      is_manual,
      status,
      purchase_type,
      admin_note,
      delivered_at,
      created_at,
      request:requests!request_id(
        id,
        request_code,
        status,
        created_at,
        outlet:outlets!outlet_id(id, name)
      )
    `, { count: 'exact' })
    .not('request', 'is', null);

  // Filter outlet
  if (outletId) {
    query = query.eq('request.outlet_id', outletId);
  }

  // Filter purchase type
  if (purchaseType) {
    query = query.eq('purchase_type', purchaseType);
  }

  // Filter item status
  if (itemStatus) {
    query = query.eq('status', itemStatus);
  }

  // Filter item source: master = item_id is not null, manual = item_id is null
  if (itemSource === 'master') {
    query = query.not('item_id', 'is', null);
  } else if (itemSource === 'manual') {
    query = query.is('item_id', null);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Purchase history query error:', error);
    return NextResponse.json({ error: 'Gagal memuat data riwayat pembelian.' }, { status: 500 });
  }

  // Post-filter by date on request.created_at and search (join filter workaround)
  let rows = (data ?? []) as any[];

  if (dateFrom || dateTo) {
    rows = rows.filter((row) => {
      const reqDate = row.request?.created_at;
      if (!reqDate) return false;
      const d = dateWIB(reqDate);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo   && d > dateTo)   return false;
      return true;
    });
  }

  if (outletId) {
    rows = rows.filter((row) => row.request?.outlet?.id === outletId);
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter((row) =>
      row.item_name?.toLowerCase().includes(q) ||
      row.request?.request_code?.toLowerCase().includes(q) ||
      row.request?.outlet?.name?.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ data: rows, total: count ?? rows.length, page, limit });
}
