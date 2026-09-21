import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('name');

  if (error) return NextResponse.json({ error: 'Gagal memuat barang.' }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, unit, category } = body as { name: string; unit: string; category?: string };

  if (!name?.trim()) return NextResponse.json({ error: 'Nama barang wajib diisi.' }, { status: 400 });
  if (!unit?.trim()) return NextResponse.json({ error: 'Satuan wajib diisi.' }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('items')
    .insert({ name: name.trim(), unit: unit.trim(), category: category?.trim() || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Gagal menambah barang.' }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, name, unit, category, is_active } = body;

  if (!id) return NextResponse.json({ error: 'ID diperlukan.' }, { status: 400 });

  const updateData: Record<string, unknown> = {};
  if (name !== undefined)      updateData.name = name;
  if (unit !== undefined)      updateData.unit = unit;
  if (category !== undefined)  updateData.category = category;
  if (is_active !== undefined) updateData.is_active = is_active;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('items')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Gagal memperbarui barang.' }, { status: 500 });
  return NextResponse.json({ data });
}
