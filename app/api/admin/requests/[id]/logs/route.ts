import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// GET: change history of one request (newest first)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('request_logs')
    .select('*')
    .eq('request_id', id)
    .order('created_at', { ascending: false })
    .limit(100);

  // Before migration_admin_notes_and_logs.sql the table doesn't exist: show empty history
  if (error) {
    return NextResponse.json({ data: [], unavailable: true });
  }

  return NextResponse.json({ data: data ?? [] });
}
