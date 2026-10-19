import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { pushConfigError, sendToSubscriptions } from '@/lib/push/server';

// Admin push subscription management (all routes protected by proxy.ts).
// GET            -> configuration status + registered admin devices
// GET ?test=1    -> also send a test notification to every admin device
// POST           -> subscribe this admin device to push notifications
// DELETE         -> unsubscribe this admin device
export async function GET(req: NextRequest) {
  const configError = pushConfigError();
  const supabase = await createAdminClient();

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, created_at, last_sent_at, user_agent, is_admin, outlet:outlets(name)')
    .order('created_at', { ascending: false });

  const devices = (subs ?? []).map((s) => ({
    id: s.id,
    is_admin: s.is_admin ?? false,
    outlet: (s.outlet as unknown as { name: string } | null)?.name ?? null,
    service: new URL(s.endpoint).hostname,
    created_at: s.created_at,
    last_sent_at: s.last_sent_at,
    user_agent: s.user_agent,
  }));

  const status = {
    configured: !configError,
    config_error: configError,
    vapid_subject: process.env.VAPID_SUBJECT?.trim() || null,
    public_key_prefix: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim().slice(0, 12) || null,
    table_error: error?.message ?? null,
    devices,
  };

  const adminSubs = (subs ?? []).filter((s) => s.is_admin);
  const targetSubs = adminSubs.length > 0 ? adminSubs : subs;

  if (req.nextUrl.searchParams.get('test') !== '1' || configError || !targetSubs?.length) {
    return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } });
  }

  const results = await sendToSubscriptions(supabase, targetSubs, {
    title: '🔔 Tes Notifikasi Admin',
    body: 'Notifikasi admin Goks! Supply Request berfungsi di perangkat ini.',
    url: '/admin/requests',
  });
  return NextResponse.json({ ...status, test_results: results }, { headers: { 'Cache-Control': 'no-store' } });
}

function validEndpoint(v: unknown): v is string {
  if (typeof v !== 'string' || v.length > 1000) return false;
  try { return new URL(v).protocol === 'https:'; } catch { return false; }
}

// Subscribe this admin device to new-request push notifications.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const sub = body.subscription as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | undefined;
  const p256dh = sub?.keys?.p256dh;
  const auth   = sub?.keys?.auth;
  if (!validEndpoint(sub?.endpoint) || typeof p256dh !== 'string' || typeof auth !== 'string') {
    return NextResponse.json({ error: 'Data langganan tidak valid.' }, { status: 400 });
  }

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        endpoint: sub.endpoint,
        p256dh,
        auth,
        outlet_id: null,
        is_admin: true,
        user_agent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
      },
      { onConflict: 'endpoint' }
    );

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205' || error.code === '42703') {
      return NextResponse.json({ error: 'Jalankan migration_admin_push.sql terlebih dahulu.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Gagal menyimpan langganan.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

// Unsubscribe this admin device.
export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!validEndpoint(body.endpoint)) {
    return NextResponse.json({ error: 'Endpoint tidak valid.' }, { status: 400 });
  }
  const supabase = await createAdminClient();
  await supabase.from('push_subscriptions').delete().eq('endpoint', body.endpoint);
  return NextResponse.json({ success: true });
}

