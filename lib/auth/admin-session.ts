import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { sign, verifySignature } from '@/lib/auth/signing';

const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours (seconds)

// Cookie value format: "<expiresAtMs>.<hmacHex>"
async function verifyToken(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const [expiresAt, sig] = value.split('.');
  if (!expiresAt || !sig) return false;
  if (!/^\d+$/.test(expiresAt) || Number(expiresAt) < Date.now()) return false;
  return verifySignature(expiresAt, sig);
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
