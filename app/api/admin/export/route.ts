import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { formatDateExport, statusLabel, purchaseStatusLabel } from '@/lib/utils/format';

export async function GET(req: NextRequest) {
  const supabase = await createAdminClient();
  const { searchParams } = new URL(req.url);

  const outlet_id  = searchParams.get('outlet_id') ?? '';
  const status     = searchParams.get('status') ?? '';
  const purchaseSt = searchParams.get('purchase_status') ?? '';
  const dateFrom   = searchParams.get('date_from') ?? '';
  const dateTo     = searchParams.get('date_to') ?? '';

  let query = supabase.from('requests').select(`
    *,
    outlet:outlets(id, name),
    request_items(*),
    purchase_receipts(id)
  `);

  if (outlet_id)  query = query.eq('outlet_id', outlet_id);
  if (status)     query = query.eq('status', status);
  if (purchaseSt) query = query.eq('purchase_status', purchaseSt);
  if (dateFrom)   query = query.gte('created_at', dateFrom);
  if (dateTo)     query = query.lte('created_at', dateTo + 'T23:59:59');

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Gagal export data.' }, { status: 500 });
  }

  const rows: Record<string, unknown>[] = [];

  for (const req of data ?? []) {
    const items = req.request_items ?? [];
    const hasReceipt = (req.purchase_receipts?.length ?? 0) > 0;

    const purchaseTypeLabel = (pt: string | null) => {
      if (pt === 'petty_cash') return 'Petty Cash';
      if (pt === 'warehouse') return 'Warehouse';
      return 'Menunggu';
    };

    if (items.length === 0) {
      rows.push({
        'Kode Request': req.request_code,
        Tanggal: formatDateExport(req.created_at),
        Outlet: req.outlet?.name ?? '-',
        Pengaju: req.requester_name,
        Barang: '-',
        Qty: 0,
        Satuan: '-',
        Tipe: '-',
        'Status Request': statusLabel(req.status),
        'Status Pembelian': purchaseStatusLabel(req.purchase_status),
        'Tipe Pembelian': '-',
        'Ada Nota': hasReceipt ? 'Ya' : 'Tidak',
        'Nota Item': '-',
        Catatan: req.note ?? '',
      });
    } else {
      for (const item of items) {
        rows.push({
          'Kode Request': req.request_code,
          Tanggal: formatDateExport(req.created_at),
          Outlet: req.outlet?.name ?? '-',
          Pengaju: req.requester_name,
          Barang: item.item_name,
          Qty: item.qty,
          Satuan: item.unit,
          Tipe: item.is_manual ? 'Manual' : 'Master Barang',
          'Status Request': statusLabel(req.status),
          'Status Pembelian': purchaseStatusLabel(req.purchase_status),
          'Tipe Pembelian': purchaseTypeLabel(item.purchase_type ?? null),
          'Ada Nota': hasReceipt ? 'Ya' : 'Tidak',
          'Nota Item': item.receipt_path 
            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/request-receipts/${item.receipt_path}` 
            : '-',
          Catatan: req.note ?? '',
        });
      }
    }
  }

  return NextResponse.json({ data: rows });
}
