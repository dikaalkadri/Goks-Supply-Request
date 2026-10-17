import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST: { endpoint, request_id } - this device follows one request
// (e.g. right after submitting it). No-op if the device isn't subscribed.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { endpoint, request_id } = body as { endpoint?: unknown; request_id?: unknown };
  if (typeof endpoint !== 'string' || endpoint.length > 1000 || typeof request_id !== 'string' || !UUID_RE.test(request_id)) {
    return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 });
  }

  const supabase = await createAdminClient();
  const [{ data: sub }, { data: request }] = await Promise.all([
    supabase.from('push_subscriptions').select('id').eq('endpoint', endpoint).maybeSingle(),
    supabase.from('requests').select('id').eq('id', request_id).maybeSingle(),
  ]);
  if (!sub || !request) return NextResponse.json({ data: { following: false } });

  const { error } = await supabase
    .from('push_follows')
    .upsert({ subscription_id: sub.id, request_id }, { onConflict: 'subscription_id,request_id', ignoreDuplicates: true });

  return NextResponse.json({ data: { following: !error } });
}
