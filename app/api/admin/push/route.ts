import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { pushConfigError, sendToSubscriptions } from '@/lib/push/server';

// Admin diagnostics for push notifications (protected by proxy.ts).
// GET            -> configuration status + registered devices
// GET ?test=1    -> also send a test notification to every device and report per-device results
export async function GET(req: NextRequest) {
  const configError = pushConfigError();
  const supabase = await createAdminClient();

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, created_at, last_sent_at, user_agent, outlet:outlets(name)')
    .order('created_at', { ascending: false });

  const devices = (subs ?? []).map((s) => ({
    id: s.id,
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

  if (req.nextUrl.searchParams.get('test') !== '1' || configError || !subs?.length) {
    return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } });
  }

  const results = await sendToSubscriptions(supabase, subs, {
    title: 'Tes notifikasi',
    body: 'Notifikasi Goks! Supply Request berfungsi di perangkat ini.',
    url: '/requests',
  });
  return NextResponse.json({ ...status, test_results: results }, { headers: { 'Cache-Control': 'no-store' } });
}
