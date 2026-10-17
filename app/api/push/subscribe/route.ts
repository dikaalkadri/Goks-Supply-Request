import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getOutletSession } from '@/lib/auth/outlet-session';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validEndpoint(v: unknown): v is string {
  if (typeof v !== 'string' || v.length > 1000) return false;
  try {
    return new URL(v).protocol === 'https:';
  } catch {
    return false;
  }
}

// POST: save or refresh this device's push subscription.
// { subscription: PushSubscriptionJSON, request_ids?: string[] }
// The outlet comes from the login session (never from the client), so the same
// call re-syncs the device after login/logout.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const sub = body.subscription as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | undefined;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!validEndpoint(sub?.endpoint) || typeof p256dh !== 'string' || typeof auth !== 'string' || p256dh.length > 200 || auth.length > 100) {
    return NextResponse.json({ error: 'Data langganan tidak valid.' }, { status: 400 });
  }

  const session = await getOutletSession();
  const supabase = await createAdminClient();

  const { data: saved, error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        endpoint: sub.endpoint,
        p256dh,
        auth,
        outlet_id: session?.outlet_id ?? null,
        user_agent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
      },
      { onConflict: 'endpoint' }
    )
    .select('id')
    .single();

  if (error || !saved) {
    if (error?.code === '42P01' || error?.code === 'PGRST205') {
      return NextResponse.json({ error: 'Fitur notifikasi belum diaktifkan.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Gagal menyimpan langganan.' }, { status: 500 });
  }

  // Follow requests submitted earlier from this device (public mode)
  const ids = Array.isArray(body.request_ids)
    ? (body.request_ids as unknown[]).filter((v): v is string => typeof v === 'string' && UUID_RE.test(v)).slice(-100)
    : [];
  if (ids.length > 0) {
    const { data: existing } = await supabase.from('requests').select('id').in('id', ids);
    const rows = (existing ?? []).map((r) => ({ subscription_id: saved.id, request_id: r.id }));
    if (rows.length > 0) {
      await supabase.from('push_follows').upsert(rows, { onConflict: 'subscription_id,request_id', ignoreDuplicates: true });
    }
  }

  return NextResponse.json({ data: { outlet_name: session?.outlet_name ?? null } });
}

// DELETE: { endpoint } - stop notifications on this device
export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!validEndpoint(body.endpoint)) {
    return NextResponse.json({ error: 'Endpoint tidak valid.' }, { status: 400 });
  }
  const supabase = await createAdminClient();
  await supabase.from('push_subscriptions').delete().eq('endpoint', body.endpoint);
  return NextResponse.json({ success: true });
}
