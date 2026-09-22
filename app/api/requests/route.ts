import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateRequestCode } from '@/lib/utils/request-code';
import type { ItemFormData } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { outlet_id, requester_name, note, items } = body as {
      outlet_id: string;
      requester_name: string;
      note?: string;
      items: ItemFormData[];
    };

    // Validation
    if (!outlet_id || typeof outlet_id !== 'string') {
      return NextResponse.json({ error: 'Outlet wajib dipilih.' }, { status: 400 });
    }
    if (!requester_name?.trim()) {
      return NextResponse.json({ error: 'Nama pengaju wajib diisi.' }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Minimal satu barang harus ditambahkan.' }, { status: 400 });
    }
    for (const item of items) {
      if (!item.item_name?.trim()) {
        return NextResponse.json({ error: 'Nama barang tidak boleh kosong.' }, { status: 400 });
      }
      if (!item.qty || item.qty <= 0) {
        return NextResponse.json({ error: `Qty untuk "${item.item_name}" harus lebih dari 0.` }, { status: 400 });
      }
      if (!item.unit?.trim()) {
        return NextResponse.json({ error: `Satuan untuk "${item.item_name}" wajib diisi.` }, { status: 400 });
      }
    }

    const supabase = await createServerClient();

    // Generate unique request code
    const request_code = await generateRequestCode();

    // Insert request
    const { data: request, error: reqError } = await supabase
      .from('requests')
      .insert({
        request_code,
        outlet_id,
        requester_name: requester_name.trim(),
        note: note?.trim() || null,
        status: 'pending',
        purchase_status: 'not_purchased',
      })
      .select('id, request_code, edit_token')
      .single();

    if (reqError || !request) {
      console.error('Insert request error:', reqError);
      return NextResponse.json(
        { error: 'Terjadi kendala saat menyimpan permintaan. Silakan coba lagi.' },
        { status: 500 }
      );
    }

    // Insert request items
    const itemsToInsert = items.map((item) => ({
      request_id: request.id,
      item_id: item.is_manual ? null : item.item_id,
      item_name: item.item_name.trim(),
      unit: item.unit.trim(),
      qty: Number(item.qty),
      is_manual: item.is_manual,
    }));

    const { error: itemsError } = await supabase
      .from('request_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Insert items error:', itemsError);
      // Rollback: delete the request
      await supabase.from('requests').delete().eq('id', request.id);
      return NextResponse.json(
        { error: 'Terjadi kendala saat menyimpan barang. Silakan coba lagi.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        request_code: request.request_code,
        request_id: request.id,
        edit_token: request.edit_token,
      },
    });
  } catch (e) {
    console.error('Create request error:', e);
    return NextResponse.json(
      { error: 'Terjadi kesalahan. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}

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
      outlet:outlets(id, name),
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
    console.error('List requests error:', error);
    return NextResponse.json({ error: 'Gagal memuat data.' }, { status: 500 });
  }

  // Filter has_receipt and has_photo in memory (Supabase free doesn't support subquery count filter easily)
  let filtered = data ?? [];
  if (hasReceipt === 'yes') filtered = filtered.filter((r) => (r.purchase_receipts?.length ?? 0) > 0);
  if (hasReceipt === 'no')  filtered = filtered.filter((r) => (r.purchase_receipts?.length ?? 0) === 0);
  if (hasPhoto === 'yes')   filtered = filtered.filter((r) => (r.request_photos?.length ?? 0) > 0);
  if (hasPhoto === 'no')    filtered = filtered.filter((r) => (r.request_photos?.length ?? 0) === 0);

  // Strip edit_token from public response
  const sanitized = filtered.map(({ edit_token: _et, ...rest }) => rest);

  return NextResponse.json({ data: sanitized, total: count ?? 0, page, limit });
}
