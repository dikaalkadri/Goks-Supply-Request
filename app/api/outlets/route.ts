import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { fetchOutletsOrdered } from '@/lib/utils/outlet-order';

export async function GET() {
  const supabase = await createServerClient();
  const { data, error } = await fetchOutletsOrdered(supabase, { activeOnly: true });

  if (error) {
    return NextResponse.json({ error: 'Gagal memuat outlet.' }, { status: 500 });
  }

  return NextResponse.json({ data });
}
