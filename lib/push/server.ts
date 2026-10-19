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

let configError: string | null | undefined; // undefined = not checked yet

/**
 * Why push can't be sent (missing/invalid VAPID env vars), or null when it's
 * configured. Values are trimmed because pasted env vars often carry
 * whitespace or quotes.
 */
export function pushConfigError(): string | null {
  if (configError !== undefined) return configError;
  const clean = (v?: string) => v?.trim().replace(/^["']|["']$/g, '') ?? '';
  const publicKey = clean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const privateKey = clean(process.env.VAPID_PRIVATE_KEY);
  const subject = clean(process.env.VAPID_SUBJECT) || 'https://goks-supply-request.vercel.app';

  if (!publicKey) return (configError = 'NEXT_PUBLIC_VAPID_PUBLIC_KEY belum diisi.');
  if (!privateKey) return (configError = 'VAPID_PRIVATE_KEY belum diisi.');
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch (e) {
    return (configError = `Konfigurasi VAPID tidak valid: ${(e as Error).message}`);
  }
  return (configError = null);
}

export function isPushConfigured(): boolean {
  const err = pushConfigError();
  if (err) console.warn('push disabled:', err);
  return !err;
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

    await sendToSubscriptions(supabase, [...subs.values()], {
      title: message.title,
      body: message.body,
      url: `/requests/${requestId}`,
      tag: `request-${requestId}`, // newer update replaces the older one on the device
    });
  } catch (e) {
    console.warn('push notify skipped:', e);
  }
}

/**
 * Push a notification to every device subscribed as admin (is_admin = true).
 * Called when a new request is created by an outlet.
 * Never throws.
 */
export async function notifyAdmins(
  message: { title: string; body: string; url: string }
): Promise<void> {
  if (!isPushConfigured()) return;
  try {
    const supabase = await createAdminClient();
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('is_admin', true);
    if (error || !subs?.length) return;
    await sendToSubscriptions(supabase, subs, { ...message, tag: 'new-request' });
  } catch (e) {
    console.warn('notifyAdmins skipped:', e);
  }
}

/** Convenience: notify all admin devices that a new supply request came in. */
export function notifyNewRequest(
  requestCode: string,
  requestId: string,
  outletName: string
) {
  notifyAdmins({
    title: `Permintaan baru: ${requestCode}`,
    body: `${outletName} mengajukan permintaan barang.`,
    url: `/admin/requests/${requestId}`,
  });
}

type Subscription = { id: string; endpoint: string; p256dh: string; auth: string };
export type SendResult = { id: string; ok: boolean; status?: number; error?: string; removed?: boolean };

/**
 * Send one payload to many subscriptions. Expired ones (404/410) are deleted,
 * delivered ones get last_sent_at. Requires pushConfigError() === null.
 */
export async function sendToSubscriptions(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  subs: Subscription[],
  payload: { title: string; body: string; url: string; tag?: string }
): Promise<SendResult[]> {
  const body = JSON.stringify(payload);
  const results = await Promise.all(
    subs.map(async (s): Promise<SendResult> => {
      try {
        const res = await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          { TTL: 60 * 60 * 24 }
        );
        return { id: s.id, ok: true, status: res.statusCode };
      } catch (err: unknown) {
        const e = err as { statusCode?: number; body?: string; message?: string };
        const removed = e.statusCode === 404 || e.statusCode === 410;
        if (!removed) console.warn('push send failed:', e.statusCode, e.body || e.message);
        return { id: s.id, ok: false, status: e.statusCode, error: (e.body || e.message || '').slice(0, 200), removed };
      }
    })
  );

  const expired = results.filter((r) => r.removed).map((r) => r.id);
  const delivered = results.filter((r) => r.ok).map((r) => r.id);
  if (expired.length > 0) await supabase.from('push_subscriptions').delete().in('id', expired);
  if (delivered.length > 0) {
    await supabase.from('push_subscriptions').update({ last_sent_at: new Date().toISOString() }).in('id', delivered);
  }
  return results;
}
