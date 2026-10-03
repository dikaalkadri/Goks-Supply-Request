import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours (seconds)

// Cookie value format: "<expiresAtMs>.<hmacHex>"
// Signed with Web Crypto so it works in both Node and Edge runtimes (proxy).
function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured');
  return secret;
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyToken(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const [expiresAt, sig] = value.split('.');
  if (!expiresAt || !sig) return false;
  if (!/^\d+$/.test(expiresAt) || Number(expiresAt) < Date.now()) return false;
  try {
    return safeEqual(sig, await sign(expiresAt));
  } catch {
    return false;
  }
}

export async function setAdminSession(): Promise<void> {
  const expiresAt = String(Date.now() + SESSION_MAX_AGE * 1000);
  const value = `${expiresAt}.${await sign(expiresAt)}`;

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function isAdminAuthenticatedFromRequest(req: NextRequest): Promise<boolean> {
  return verifyToken(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}
