import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logRequestEvent } from '@/lib/utils/request-log';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu', processing: 'Diproses', completed: 'Selesai', rejected: 'Ditolak',
};
const PURCHASE_LABEL: Record<string, string> = {
  not_purchased: 'Belum Dibeli', purchased: 'Sudah Dibeli',
};

type Change = { field: string; label: string; from: string | null; to: string | null };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('requests')
    .select(`
      *,
      outlet:outlets(id, name),
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
    'purchase_status',
  ];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) updateData[field] = body[field];
  }

  // Optional per-item changes: [{ id, status?, admin_note?, purchase_type? }]
  const itemChanges = Array.isArray(body.items)
    ? (body.items as { id: string; status?: string; admin_note?: string | null; purchase_type?: string | null }[])
    : [];
  const validItemStatuses = ['pending', 'completed', 'rejected'];
  const validPurchaseTypes = ['warehouse', 'petty_cash'];
  const invalidItem = itemChanges.some((i) =>
    !i?.id ||
    ('status' in i && !validItemStatuses.includes(i.status as string)) ||
    ('purchase_type' in i && i.purchase_type !== null && !validPurchaseTypes.includes(i.purchase_type as string)) ||
    ('admin_note' in i && i.admin_note !== null && (typeof i.admin_note !== 'string' || i.admin_note.length > 500))
  );
  if (invalidItem) {
    return NextResponse.json({ error: 'Data barang tidak valid.' }, { status: 400 });
  }

  if (Object.keys(updateData).length === 0 && itemChanges.length === 0) {
    return NextResponse.json({ error: 'Tidak ada data yang diubah.' }, { status: 400 });
  }

  updateData.updated_at = new Date().toISOString();

  const supabase = await createAdminClient();

  // Snapshot before the update, for the change history
  const { data: before } = await supabase
    .from('requests')
    .select('request_code, outlet_id, requester_name, note, status, purchase_status, outlet:outlets(name), request_items(*)')
    .eq('id', id)
    .single();
  const beforeItems = new Map(
    ((before?.request_items ?? []) as { id: string; item_name: string; status?: string; admin_note?: string | null; purchase_type?: string | null }[])
      .map((i) => [i.id, i])
  );

  const changes: Change[] = [];
  for (const item of itemChanges) {
    const patch: Record<string, unknown> = {};
    if ('status' in item) patch.status = item.status;
    if ('admin_note' in item) patch.admin_note = item.admin_note?.trim() || null;
    if ('purchase_type' in item) patch.purchase_type = item.purchase_type || null;
    if (Object.keys(patch).length === 0) continue;

    const prev = beforeItems.get(item.id) as any;
    const resolvedPurchaseType = patch.purchase_type ?? prev?.purchase_type;

    if (
      'status' in patch && 
      patch.status === 'completed' && 
      resolvedPurchaseType === 'warehouse' && 
      !prev?.delivered_at
    ) {
      patch.delivered_at = new Date().toISOString();
    }

    const { error: itemErr } = await supabase
      .from('request_items')
      .update(patch)
      .eq('id', item.id)
      .eq('request_id', id);
    if (itemErr) {
      console.error('Update item error:', itemErr);
      return NextResponse.json({ error: 'Gagal memperbarui barang.' }, { status: 500 });
    }

    const name = prev?.item_name ?? 'Barang';
    if ('status' in patch && (prev?.status ?? 'pending') !== patch.status) {
      changes.push({
        field: 'item_status', label: `Status ${name}`,
        from: STATUS_LABEL[prev?.status ?? 'pending'] ?? null, to: STATUS_LABEL[patch.status as string] ?? null,
      });
    }
    if ('admin_note' in patch && (prev?.admin_note ?? null) !== patch.admin_note) {
      changes.push({
        field: 'item_note', label: `Catatan ${name}`,
        from: prev?.admin_note ?? null, to: patch.admin_note as string | null,
      });
    }
    if ('purchase_type' in patch && (prev?.purchase_type ?? null) !== patch.purchase_type) {
      const pLabel = (val: string | null) => val === 'warehouse' ? 'Warehouse' : val === 'petty_cash' ? 'Petty Cash' : '-';
      changes.push({
        field: 'item_purchase_type', label: `Tipe Pembelian ${name}`,
        from: pLabel(prev?.purchase_type ?? null), to: pLabel(patch.purchase_type as string | null),
      });
    }
  }

  // Request status follows its items: 'completed' (Selesai) once every item
  // has been reviewed by admin, otherwise 'pending' (Menunggu).
  const { data: items, error: itemsErr } = await supabase
    .from('request_items')
    .select('status')
    .eq('request_id', id);
  if (!itemsErr && items && items.length > 0) {
    const allReviewed = items.every((i) => i.status && i.status !== 'pending');
    updateData.status = allReviewed ? 'completed' : 'pending';
  }

  const { data, error } = await supabase
    .from('requests')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Gagal memperbarui permintaan.' }, { status: 500 });
  }

  if (before) {
    if ('outlet_id' in updateData && updateData.outlet_id !== before.outlet_id) {
      const { data: outlet } = await supabase.from('outlets').select('name').eq('id', updateData.outlet_id as string).single();
      const beforeOutlet = before.outlet as unknown as { name: string } | null;
      changes.push({ field: 'outlet', label: 'Outlet', from: beforeOutlet?.name ?? null, to: outlet?.name ?? null });
    }
    if ('requester_name' in updateData && updateData.requester_name !== before.requester_name) {
      changes.push({ field: 'requester_name', label: 'Nama Pengaju', from: before.requester_name, to: updateData.requester_name as string });
    }
    if ('note' in updateData && (updateData.note ?? null) !== (before.note ?? null)) {
      changes.push({ field: 'note', label: 'Catatan', from: before.note ?? null, to: (updateData.note as string | null) ?? null });
    }
    if ('purchase_status' in updateData && updateData.purchase_status !== before.purchase_status) {
      changes.push({
        field: 'purchase_status', label: 'Status Pembelian',
        from: PURCHASE_LABEL[before.purchase_status] ?? before.purchase_status,
        to: PURCHASE_LABEL[updateData.purchase_status as string] ?? (updateData.purchase_status as string),
      });
    }
    if ('status' in updateData && updateData.status !== before.status) {
      changes.push({
        field: 'status', label: 'Status Permintaan',
        from: STATUS_LABEL[before.status] ?? before.status, to: STATUS_LABEL[updateData.status as string] ?? null,
      });
    }
    if (changes.length > 0) {
      await logRequestEvent({ request_id: id, request_code: before.request_code, action: 'updated', actor: 'admin', changes });
    }
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createAdminClient();

  const { data: existing } = await supabase.from('requests').select('request_code').eq('id', id).single();
  const { error } = await supabase.from('requests').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: 'Gagal menghapus permintaan.' }, { status: 500 });
  }

  if (existing) {
    await logRequestEvent({ request_id: null, request_code: existing.request_code, action: 'deleted', actor: 'admin' });
  }

  return NextResponse.json({ success: true });
}
