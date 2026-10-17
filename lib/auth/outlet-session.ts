import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import { sign, verifySignature } from '@/lib/auth/signing';

// Outlet ("user" role) login. Optional: without this cookie the app keeps
// working in public mode. With it, request lists/details are scoped to the outlet.

const OUTLET_SESSION_COOKIE = 'outlet_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days (seconds)

export const DEFAULT_OUTLET_PASSWORD = '12345678';
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 5;

/**
 * Default login username for an outlet: its name without the leading number,
 * e.g. "01. TAPLAU" -> "TAPLAU". Keep in sync with the regexp in
 * database/migration_outlet_users*.sql.
 */
export function defaultOutletUsername(outletName: string): string {
  return outletName.replace(/^\s*\d+\s*[.)-]?\s*/, '').trim() || outletName.trim();
}

export interface OutletSession {
  user_id: string;
  username: string;
  outlet_id: string;
  outlet_name: string;
}

// Cookie value: "<userId>.<outletId>.<sessionVersion>.<expiresAtMs>.<hmacHex>"
// (UUIDs contain no dots). sessionVersion lets admin force-logout by resetting
// the password or deactivating the account.
export async function setOutletSession(user: { id: string; outlet_id: string; session_version: number }) {
  const expiresAt = String(Date.now() + SESSION_MAX_AGE * 1000);
  const payload = `${user.id}.${user.outlet_id}.${user.session_version}.${expiresAt}`;
  const value = `${payload}.${await sign(payload)}`;

  const cookieStore = await cookies();
  cookieStore.set(OUTLET_SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

export async function clearOutletSession() {
  const cookieStore = await cookies();
  cookieStore.delete(OUTLET_SESSION_COOKIE);
}

async function readCookie(): Promise<{ userId: string; outletId: string; version: number } | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(OUTLET_SESSION_COOKIE)?.value;
  if (!value) return null;

  const parts = value.split('.');
  if (parts.length !== 5) return null;
  const [userId, outletId, version, expiresAt, sig] = parts;
  if (!/^\d+$/.test(version) || !/^\d+$/.test(expiresAt) || Number(expiresAt) < Date.now()) return null;
  if (!(await verifySignature(`${userId}.${outletId}.${version}.${expiresAt}`, sig))) return null;

  return { userId, outletId, version: Number(version) };
}

/**
 * The logged-in outlet, or null (public mode). Checks the DB so a deactivated
 * account, reset password or deactivated outlet ends the session immediately.
 * Never throws (e.g. before migration_outlet_users.sql is applied).
 */
export async function getOutletSession(): Promise<OutletSession | null> {
  try {
    const token = await readCookie();
    if (!token) return null;

    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('outlet_users')
      .select('id, username, outlet_id, is_active, session_version, outlet:outlets(name, is_active)')
      .eq('id', token.userId)
      .single();
    if (error || !data) return null;

    const outlet = data.outlet as unknown as { name: string; is_active: boolean } | null;
    if (
      !data.is_active ||
      data.session_version !== token.version ||
      data.outlet_id !== token.outletId ||
      !outlet?.is_active
    ) {
      return null;
    }

    return { user_id: data.id, username: data.username, outlet_id: data.outlet_id, outlet_name: outlet.name };
  } catch {
    return null;
  }
}

/** True when the error means the outlet_users table doesn't exist yet. */
export function isMissingTableError(error: { code?: string } | null): boolean {
  return error?.code === '42P01' || error?.code === 'PGRST205';
}
