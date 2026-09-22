import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('outlets')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    return NextResponse.json({ error: 'Gagal memuat outlet.' }, { status: 500 });
  }

  return NextResponse.json({ data });
}
