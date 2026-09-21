import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_SECRET = 'authenticated';

export async function setAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, SESSION_SECRET, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE);
  return session?.value === SESSION_SECRET;
}

export function isAdminAuthenticatedFromRequest(req: NextRequest): boolean {
  const session = req.cookies.get(ADMIN_SESSION_COOKIE);
  return session?.value === SESSION_SECRET;
}
