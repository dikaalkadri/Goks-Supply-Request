import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase.from('outlets').select('*').order('name');
  if (error) return NextResponse.json({ error: 'Gagal memuat outlet.' }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, code } = body as { name: string; code: string };
  if (!name?.trim()) return NextResponse.json({ error: 'Nama outlet wajib diisi.' }, { status: 400 });
  if (!code?.trim()) return NextResponse.json({ error: 'Kode outlet wajib diisi.' }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('outlets')
    .insert({ name: name.trim(), code: code.trim().toUpperCase() })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Kode outlet sudah digunakan.' }, { status: 400 });
    return NextResponse.json({ error: 'Gagal menambah outlet.' }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, name, code, is_active } = body;
  if (!id) return NextResponse.json({ error: 'ID diperlukan.' }, { status: 400 });

  const updateData: Record<string, unknown> = {};
  if (name !== undefined)      updateData.name = name;
  if (code !== undefined)      updateData.code = code;
  if (is_active !== undefined) updateData.is_active = is_active;

  const supabase = createServerClient();
  const { data, error } = await supabase.from('outlets').update(updateData).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: 'Gagal memperbarui outlet.' }, { status: 500 });
  return NextResponse.json({ data });
}
