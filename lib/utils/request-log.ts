import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { buildUpdateMessage, notifyRequestFollowers } from '@/lib/push/server';
import type { RequestLog } from '@/types';

type LogChange = NonNullable<RequestLog['detail']['changes']>[number];

/**
 * Write one entry to request_logs. Never throws: logging must not break the
 * main action (e.g. before migration_admin_notes_and_logs.sql is applied).
 */
export async function logRequestEvent(entry: {
  request_id: string | null;
  request_code: string;
  action: RequestLog['action'];
  actor: RequestLog['actor'];
  changes?: LogChange[];
}): Promise<void> {
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('request_logs').insert({
      request_id: entry.request_id,
      request_code: entry.request_code,
      action: entry.action,
      actor: entry.actor,
      detail: entry.changes ? { changes: entry.changes } : {},
    });
    if (error) console.warn('request_logs insert skipped:', error.message);
  } catch (e) {
    console.warn('request_logs insert skipped:', e);
  }

  // Admin processed the request -> notify the outlet's devices after the
  // response is sent, so saving in the admin panel isn't slowed down.
  if (entry.actor === 'admin' && entry.action === 'updated' && entry.request_id && entry.changes) {
    const message = buildUpdateMessage(entry.request_code, entry.changes);
    const requestId = entry.request_id;
    if (message) after(() => notifyRequestFollowers(requestId, message));
  }
}
