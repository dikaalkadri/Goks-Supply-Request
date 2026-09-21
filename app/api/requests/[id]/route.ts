import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('requests')
    .select(`
      *,
      outlet:outlets(id, name, code),
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
