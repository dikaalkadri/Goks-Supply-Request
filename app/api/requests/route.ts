import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateRequestCode } from '@/lib/utils/request-code';
import { sanitizeSearch, mediaFilterSelect, applyMediaFilters } from '@/lib/utils/request-query';
import { logRequestEvent } from '@/lib/utils/request-log';
import type { ItemFormData } from '@/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CODE_ATTEMPTS = 5;

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

    // Insert request. The code is "last code today + 1", so two submits at the
    // same moment can pick the same code; on a unique violation (23505) we
    // regenerate and retry instead of failing the user's request.
    let request: { id: string; request_code: string; edit_token: string } | null = null;
    let reqError: { code?: string; message?: string } | null = null;
    for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
      const request_code = await generateRequestCode();
      const res = await supabase
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
      request = res.data;
      reqError = res.error;
      if (!reqError || reqError.code !== '23505') break;
      // Small random backoff so concurrent submits don't collide again
      await new Promise((r) => setTimeout(r, 50 + Math.random() * 150));
    }

    if (reqError || !request) {
      console.error('Insert request error:', reqError);
      return NextResponse.json(
        { error: 'Terjadi kendala saat menyimpan permintaan. Silakan coba lagi.' },
        { status: 500 }
      );
    }

    // Insert request items. IDs are generated here (not read back via RETURNING,
    // which can come back empty under RLS) so the client can attach per-item photos.
    const itemsToInsert = items.map((item) => ({
      id: crypto.randomUUID(),
      request_id: request!.id,
      item_id: item.is_manual ? null : item.item_id,
      item_name: item.item_name.trim(),
      unit: item.unit.trim(),
      qty: Number(item.qty),
      is_manual: item.is_manual,
      purchase_type: null,
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

    await logRequestEvent({
      request_id: request.id,
      request_code: request.request_code,
      action: 'created',
      actor: 'user',
    });

    return NextResponse.json({
      data: {
        request_code: request.request_code,
        request_id: request.id,
        edit_token: request.edit_token,
        // Same order as `items` in the request body, used to attach per-item photos
        item_ids: itemsToInsert.map((i) => i.id),
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
  // "Permintaan Saya": request ids remembered by this browser
  const ids          = (searchParams.get('ids') ?? '').split(',').filter((v) => UUID_RE.test(v)).slice(0, 100);

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
  if (searchParams.has('ids')) query = query.in('id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000']);
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

  // Strip edit_token (secret) and the has_photo helper join from public response
  const sanitized = ((data ?? []) as unknown as Record<string, unknown>[]).map(({ edit_token: _et, ph: _ph, ...rest }) => rest);

  return NextResponse.json({ data: sanitized, total: count ?? 0, page, limit });
}
