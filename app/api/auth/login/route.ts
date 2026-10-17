import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createAdminClient } from '@/lib/supabase/server';
import {
  setOutletSession, isMissingTableError, MAX_FAILED_ATTEMPTS, LOCK_MINUTES,
} from '@/lib/auth/outlet-session';

const INVALID = 'Username atau password salah.';

// POST: outlet login { username, password }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { username, password } = body as { username?: string; password?: string };

  if (!username?.trim() || !password || password.length > 100) {
    return NextResponse.json({ error: INVALID }, { status: 400 });
  }

  const supabase = await createAdminClient();
  // Case-insensitive exact match (ilike without wildcards; escape % and _)
  const pattern = username.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data: user, error } = await supabase
    .from('outlet_users')
    .select('id, outlet_id, password_hash, is_active, session_version, failed_attempts, locked_until, outlet:outlets(name, is_active)')
    .ilike('username', pattern)
    .maybeSingle();

  if (isMissingTableError(error)) {
    return NextResponse.json({ error: 'Fitur login outlet belum diaktifkan.' }, { status: 503 });
  }
  if (error || !user) {
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }

  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    const minutes = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
    return NextResponse.json(
      { error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${minutes} menit.` },
      { status: 429 }
    );
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const attempts = (user.failed_attempts ?? 0) + 1;
    const lock = attempts >= MAX_FAILED_ATTEMPTS;
    await supabase
      .from('outlet_users')
      .update({
        failed_attempts: lock ? 0 : attempts,
        locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null,
      })
      .eq('id', user.id);
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }

  const outlet = user.outlet as unknown as { name: string; is_active: boolean } | null;
  if (!user.is_active) {
    return NextResponse.json({ error: 'Akun dinonaktifkan. Hubungi admin.' }, { status: 403 });
  }
  if (!outlet?.is_active) {
    return NextResponse.json({ error: 'Outlet dinonaktifkan. Hubungi admin.' }, { status: 403 });
  }

  await supabase
    .from('outlet_users')
    .update({ failed_attempts: 0, locked_until: null, last_login_at: new Date().toISOString() })
    .eq('id', user.id);

  await setOutletSession(user);
  return NextResponse.json({ data: { outlet_id: user.outlet_id, outlet_name: outlet.name } });
}
