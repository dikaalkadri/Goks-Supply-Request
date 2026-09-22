import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// GET: admin dashboard stats
export async function GET() {
  const supabase = await createAdminClient();

  const [totalRes, todayRes, statusRes, purchaseRes, noReceiptRes] = await Promise.all([
    supabase.from('requests').select('id', { count: 'exact', head: true }),
    supabase.from('requests').select('id', { count: 'exact', head: true })
      .gte('created_at', new Date().toISOString().slice(0, 10)),
    supabase.from('requests').select('status'),
    supabase.from('requests').select('purchase_status'),
    supabase.from('requests')
      .select('id, purchase_receipts(id)')
      .eq('purchase_status', 'purchased'),
  ]);

  const statuses = statusRes.data ?? [];
  const purchases = purchaseRes.data ?? [];

  const purchasedNoReceipt = (noReceiptRes.data ?? []).filter(
    (r) => (r.purchase_receipts as { id: string }[]).length === 0
  ).length;

  return NextResponse.json({
    data: {
      total:               totalRes.count ?? 0,
      today:               todayRes.count ?? 0,
      pending:             statuses.filter((r) => r.status === 'pending').length,
      processing:          statuses.filter((r) => r.status === 'processing').length,
      completed:           statuses.filter((r) => r.status === 'completed').length,
      rejected:            statuses.filter((r) => r.status === 'rejected').length,
      not_purchased:       purchases.filter((r) => r.purchase_status === 'not_purchased').length,
      purchased:           purchases.filter((r) => r.purchase_status === 'purchased').length,
      purchased_no_receipt: purchasedNoReceipt,
    },
  });
}
