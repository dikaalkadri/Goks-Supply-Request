import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createAdminClient();
  const { data, error } = await supabase.from('outlets').select('*').order('name');
  if (error) return NextResponse.json({ error: 'Gagal memuat outlet.' }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name } = body as { name: string };
  if (!name?.trim()) return NextResponse.json({ error: 'Nama outlet wajib diisi.' }, { status: 400 });

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('outlets')
    .insert({ name: name.trim() })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Nama outlet sudah digunakan.' }, { status: 400 });
    return NextResponse.json({ error: 'Gagal menambah outlet.' }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, name, is_active } = body;
  if (!id) return NextResponse.json({ error: 'ID diperlukan.' }, { status: 400 });

  const updateData: Record<string, unknown> = {};
  if (name !== undefined)      updateData.name = name;
  if (is_active !== undefined) updateData.is_active = is_active;

  const supabase = await createAdminClient();
  const { data, error } = await supabase.from('outlets').update(updateData).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: 'Gagal memperbarui outlet.' }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json() as { id: string };
  if (!id) return NextResponse.json({ error: 'ID diperlukan.' }, { status: 400 });

  const supabase = await createAdminClient();
  const { error } = await supabase.from('outlets').delete().eq('id', id);

  if (error) {
    // FK violation – outlet still has requests
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Outlet tidak dapat dihapus karena masih memiliki permintaan terkait.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Gagal menghapus outlet.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

