import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { DashboardRecap } from '@/types';

// GET: admin dashboard stats
// Supports optional ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const dateFrom = searchParams.get('date_from') ?? null;
  const dateTo   = searchParams.get('date_to')   ?? null;

  const supabase = await createAdminClient();

  // Helper – apply date range to any query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyRange(q: any) {
    if (dateFrom) q = q.gte('created_at', dateFrom);
    if (dateTo)   q = q.lte('created_at', dateTo + 'T23:59:59');
    return q;
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  const [totalRes, todayRes, statusRes, purchaseRes, noReceiptRes] = await Promise.all([
    applyRange(supabase.from('requests').select('id', { count: 'exact', head: true })),
    // "hari ini" is always the actual calendar day regardless of filter
    supabase.from('requests')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStr),
    applyRange(supabase.from('requests').select('status')),
    applyRange(supabase.from('requests').select('purchase_status')),
    applyRange(
      supabase.from('requests')
        .select('id, purchase_receipts(id)')
        .eq('purchase_status', 'purchased')
    ),
  ]);

  const recap     = await buildRecap(supabase, dateFrom, dateTo);
  const statuses  = statusRes.data  ?? [];
  const purchases = purchaseRes.data ?? [];

  const purchasedNoReceipt = (noReceiptRes.data ?? []).filter(
    (r) => (r.purchase_receipts as { id: string }[]).length === 0
  ).length;

  return NextResponse.json({
    data: {
      total:                totalRes.count ?? 0,
      today:                todayRes.count ?? 0,
      pending:              statuses.filter((r) => r.status === 'pending').length,
      processing:           statuses.filter((r) => r.status === 'processing').length,
      completed:            statuses.filter((r) => r.status === 'completed').length,
      rejected:             statuses.filter((r) => r.status === 'rejected').length,
      not_purchased:        purchases.filter((r) => r.purchase_status === 'not_purchased').length,
      purchased:            purchases.filter((r) => r.purchase_status === 'purchased').length,
      purchased_no_receipt: purchasedNoReceipt,
      recap,
    },
  });
}

const RECAP_DAYS = 30;
const RECAP_TOP  = 10;

// Top outlets and most requested items over the given date range (or last RECAP_DAYS days).
async function buildRecap(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  dateFrom: string | null,
  dateTo:   string | null,
): Promise<DashboardRecap> {
  let since: string;
  let days:  number;

  if (dateFrom && dateTo) {
    since = dateFrom;
    days  = Math.round(
      (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (24 * 60 * 60 * 1000)
    ) + 1;
  } else if (dateFrom) {
    since = dateFrom;
    days  = Math.round((Date.now() - new Date(dateFrom).getTime()) / (24 * 60 * 60 * 1000)) + 1;
  } else {
    since = new Date(Date.now() - RECAP_DAYS * 24 * 60 * 60 * 1000).toISOString();
    days  = RECAP_DAYS;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from('requests')
    .select('outlet_id, outlet:outlets(name), request_items(*)')
    .gte('created_at', since);

  if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');

  const { data, error } = await q;
  if (error || !data) return { days, top_outlets: [], top_items: [] };

  const outlets = new Map<string, DashboardRecap['top_outlets'][number]>();
  const items   = new Map<string, DashboardRecap['top_items'][number]>();

  for (const req of data) {
    const outletName = (req.outlet as unknown as { name: string } | null)?.name ?? '-';
    const reqItems   = (req.request_items ?? []) as {
      item_name: string; unit: string; qty: number; status?: string;
    }[];

    const o = outlets.get(req.outlet_id) ?? {
      outlet_id: req.outlet_id, name: outletName, requests: 0, items: 0,
    };
    o.requests += 1;
    o.items    += reqItems.length;
    outlets.set(req.outlet_id, o);

    for (const it of reqItems) {
      const key = `${it.item_name.trim().toLowerCase()}|${it.unit.trim().toLowerCase()}`;
      const agg = items.get(key) ?? {
        name: it.item_name.trim(), unit: it.unit.trim(), requests: 0, qty: 0, rejected: 0,
      };
      agg.requests += 1;
      agg.qty      += Number(it.qty) || 0;
      if (it.status === 'rejected') agg.rejected += 1;
      items.set(key, agg);
    }
  }

  return {
    days,
    top_outlets: [...outlets.values()]
      .sort((a, b) => b.requests - a.requests || b.items - a.items)
      .slice(0, RECAP_TOP),
    top_items: [...items.values()]
      .sort((a, b) => b.requests - a.requests || b.qty - a.qty)
      .slice(0, RECAP_TOP),
  };
}
