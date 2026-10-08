import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createAdminClient();
  const { searchParams } = new URL(req.url);

  const itemId   = searchParams.get('item_id') ?? '';
  const dateFrom = searchParams.get('date_from') ?? '';
  const dateTo   = searchParams.get('date_to') ?? '';
  const page     = parseInt(searchParams.get('page') ?? '1');
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
  const offset   = (page - 1) * limit;

  if (!itemId) {
    return NextResponse.json({ data: [], total: 0 });
  }

  let query = supabase
    .from('request_items')
    .select(`
      id,
      item_name,
      qty,
      unit,
      status,
      delivered_at,
      created_at,
      request:requests!request_id(
        id,
        request_code,
        created_at,
        outlet:outlets!outlet_id(id, name)
      )
    `, { count: 'exact' })
    .eq('item_id', itemId)
    .not('request', 'is', null);

  if (dateFrom) {
    query = query.gte('request.created_at', dateFrom);
  }
  if (dateTo) {
    query = query.lte('request.created_at', dateTo + 'T23:59:59');
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Distribution query error:', error);
    return NextResponse.json({ error: 'Gagal memuat data distribusi.' }, { status: 500 });
  }

  // Filter by date on request level (Supabase join filter workaround)
  let rows = (data ?? []) as any[];
  if (dateFrom || dateTo) {
    rows = rows.filter((row) => {
      const reqDate = row.request?.created_at;
      if (!reqDate) return false;
      const d = reqDate.substring(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }

  return NextResponse.json({ data: rows, total: count ?? rows.length, page, limit });
}
