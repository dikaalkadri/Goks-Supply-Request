import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PUT: save the outlet order { ids: string[] } (first id = position 1)
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ids = body.ids as unknown;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 1000 || !ids.every((v) => typeof v === 'string' && UUID_RE.test(v))) {
    return NextResponse.json({ error: 'Urutan tidak valid.' }, { status: 400 });
  }
  if (new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: 'Urutan tidak valid.' }, { status: 400 });
  }

  const supabase = await createAdminClient();
  const { data: current, error: fetchErr } = await supabase.from('outlets').select('id, sort_order');
  if (fetchErr) {
    if (fetchErr.code === '42703') {
      return NextResponse.json(
        { error: 'Kolom urutan belum ada. Jalankan database/migration_outlet_sort_order.sql di Supabase.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Gagal memuat outlet.' }, { status: 500 });
  }

  const existing = new Map((current ?? []).map((o) => [o.id, o.sort_order as number | null]));
  if (ids.length !== existing.size || !ids.every((id) => existing.has(id))) {
    return NextResponse.json({ error: 'Daftar outlet sudah berubah. Muat ulang halaman.' }, { status: 409 });
  }

  // Only write rows whose position actually changed
  const changes = (ids as string[])
    .map((id, idx) => ({ id, sort_order: idx + 1 }))
    .filter((o) => existing.get(o.id) !== o.sort_order);

  const results = await Promise.all(
    changes.map((o) => supabase.from('outlets').update({ sort_order: o.sort_order }).eq('id', o.id))
  );
  if (results.some((r) => r.error)) {
    return NextResponse.json({ error: 'Gagal menyimpan urutan.' }, { status: 500 });
  }

  return NextResponse.json({ data: { updated: changes.length } });
}
