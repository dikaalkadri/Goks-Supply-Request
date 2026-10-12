import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { logRequestEvent } from '@/lib/utils/request-log';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

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

  // Strip edit_token from public response
  const { edit_token: _et, ...sanitized } = data;

  return NextResponse.json({ data: sanitized });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { note } = body as { note?: string };

  const supabase = await createAdminClient();

  const { data: request, error: reqErr } = await supabase
    .from('requests')
    .select('id, request_code, status, note')
    .eq('id', id)
    .single();

  if (reqErr || !request) {
    return NextResponse.json({ error: 'Permintaan tidak ditemukan.' }, { status: 404 });
  }

  if (request.status !== 'pending') {
    return NextResponse.json({ error: 'Permintaan yang sudah diproses atau selesai tidak dapat diubah.' }, { status: 400 });
  }

  const trimmedNote = note !== undefined ? note.trim() || null : request.note;

  const { data: updated, error: updateErr } = await supabase
    .from('requests')
    .update({ note: trimmedNote, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: 'Gagal memperbarui permintaan.' }, { status: 500 });
  }

  if ((request.note ?? null) !== (trimmedNote ?? null)) {
    await logRequestEvent({
      request_id: id,
      request_code: request.request_code,
      action: 'updated',
      actor: 'user',
      changes: [{ field: 'note', label: 'Catatan Permintaan', from: request.note ?? null, to: trimmedNote ?? null }],
    });
  }

  return NextResponse.json({ data: updated });
}