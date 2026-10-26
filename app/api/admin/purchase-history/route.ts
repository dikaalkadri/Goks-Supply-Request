import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { dateWIB } from '@/lib/utils/date-range';

export async function GET(req: NextRequest) {
  const supabase = await createAdminClient();
  const { searchParams } = new URL(req.url);

  const outletId     = searchParams.get('outlet_id')     ?? '';
  const dateFrom     = searchParams.get('date_from')     ?? '';
  const dateTo       = searchParams.get('date_to')       ?? '';
  const purchaseType = searchParams.get('purchase_type') ?? '';
  const itemStatus   = searchParams.get('item_status')   ?? '';
  const itemSource   = searchParams.get('item_source')   ?? ''; // 'master' | 'manual'
  const search       = searchParams.get('search')        ?? '';
  const page         = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit        = Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10));

  // Ambil data item dari DB dengan filter tingkat kolom yang bisa dilakukan di SQL
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
        outlet_id,
        outlet:outlets!outlet_id(id, name)
      )
    `)
    .not('request', 'is', null);

  if (purchaseType) {
    query = query.eq('purchase_type', purchaseType);
  }

  if (itemStatus) {
    query = query.eq('status', itemStatus);
  }

  if (itemSource === 'master') {
    query = query.not('item_id', 'is', null);
  } else if (itemSource === 'manual') {
    query = query.is('item_id', null);
  }

  // Urutkan berdasarkan tanggal dibuat terbaru
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Purchase history query error:', error);
    return NextResponse.json({ error: 'Gagal memuat data riwayat pembelian.' }, { status: 500 });
  }

  let rows = (data ?? []) as any[];

  // 1. Filter Tanggal Permintaan (berdasarkan WIB)
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

  // 2. Filter Outlet
  if (outletId) {
    rows = rows.filter((row) => row.request?.outlet_id === outletId || row.request?.outlet?.id === outletId);
  }

  // 3. Filter Pencarian Teks
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter((row) =>
      row.item_name?.toLowerCase().includes(q) ||
      row.request?.request_code?.toLowerCase().includes(q) ||
      row.request?.outlet?.name?.toLowerCase().includes(q)
    );
  }

  // Total data setelah SEMUA filter diaplikasikan secara akurat
  const total = rows.length;

  // Pagination diaplikasikan SETELAH filter
  const offset = (page - 1) * limit;
  const paginatedRows = rows.slice(offset, offset + limit);

  return NextResponse.json({
    data: paginatedRows,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}
