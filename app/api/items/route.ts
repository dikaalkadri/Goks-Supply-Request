import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    return NextResponse.json({ error: 'Gagal memuat barang.' }, { status: 500 });
  }

  return NextResponse.json({ data });
}
