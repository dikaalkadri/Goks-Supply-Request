import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/server';
import type { RequestLog } from '@/types';

type Change = NonNullable<RequestLog['detail']['changes']>[number];

// Changes an outlet cares about. Admin-only edits (outlet, requester name,
// request note) don't notify.
const NOTIFY_FIELDS = new Set([
  'status',
  'purchase_status',
  'item_status',
  'item_note',
  'item_purchase_type',
  'item_delivered_at',
  'item_added',
  'item_deleted',
]);

let configured: boolean | null = null;

/** True when VAPID keys are set. Without them push is silently disabled. */
export function isPushConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return (configured = false);
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'https://goks-supply-request.vercel.app',
    publicKey,
    privateKey
  );
  return (configured = true);
}

function describe(c: Change): string {
  if (c.field === 'item_added') return `Barang ditambahkan: ${c.to}`;
  if (c.field === 'item_deleted') return `Barang dihapus: ${c.from}`;
  return `${c.label}: ${c.to || '—'}`;
}

/** Notification text for a set of admin changes, or null if nothing worth notifying. */
export function buildUpdateMessage(requestCode: string, changes: Change[]) {
  const relevant = changes.filter((c) => NOTIFY_FIELDS.has(c.field));
  if (relevant.length === 0) return null;

  const lines = relevant.slice(0, 3).map(describe);
  if (relevant.length > 3) lines.push(`+${relevant.length - 3} perubahan lain`);
  return { title: `${requestCode} diproses admin`, body: lines.join('\n') };
}

/**
 * Push a notification to every device following this request: devices logged
 * in as the request's outlet, plus devices that follow the request directly.
 * Never throws; expired subscriptions are removed.
 */
export async function notifyRequestFollowers(
  requestId: string,
  message: { title: string; body: string }
): Promise<void> {
  if (!isPushConfigured()) return;
  try {
    const supabase = await createAdminClient();

    const { data: request } = await supabase
      .from('requests')
      .select('id, outlet_id, request_code')
      .eq('id', requestId)
      .single();
    if (!request) return;

    const [byOutlet, follows] = await Promise.all([
      supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('outlet_id', request.outlet_id),
      supabase.from('push_follows').select('subscription_id').eq('request_id', requestId),
    ]);
    if (byOutlet.error || follows.error) return; // tables missing (migration not applied)

    const subs = new Map((byOutlet.data ?? []).map((s) => [s.id, s]));
    const extraIds = (follows.data ?? []).map((f) => f.subscription_id).filter((id) => !subs.has(id));
    if (extraIds.length > 0) {
      const { data } = await supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth').in('id', extraIds);
      for (const s of data ?? []) subs.set(s.id, s);
    }
    if (subs.size === 0) return;

    const payload = JSON.stringify({
      title: message.title,
      body: message.body,
      url: `/requests/${requestId}`,
      tag: `request-${requestId}`, // newer update replaces the older one on the device
    });

    const expired: string[] = [];
    const delivered: string[] = [];
    await Promise.all(
      [...subs.values()].map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            { TTL: 60 * 60 * 24 }
          );
          delivered.push(s.id);
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) expired.push(s.id);
          else console.warn('push send failed:', status, (err as Error).message);
        }
      })
    );

    if (expired.length > 0) await supabase.from('push_subscriptions').delete().in('id', expired);
    if (delivered.length > 0) {
      await supabase.from('push_subscriptions').update({ last_sent_at: new Date().toISOString() }).in('id', delivered);
    }
  } catch (e) {
    console.warn('push notify skipped:', e);
  }
}
