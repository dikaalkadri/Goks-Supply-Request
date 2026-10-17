import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { hashPin } from '@/lib/auth/pin';
import { fetchOutletsOrdered } from '@/lib/utils/outlet-order';
import { DEFAULT_OUTLET_PASSWORD, defaultOutletUsername, isMissingTableError } from '@/lib/auth/outlet-session';

const MIGRATION_MSG = 'Tabel akun belum ada. Jalankan database/migration_outlet_users.sql di Supabase.';

// Never send password_hash to the browser
const USER_COLUMNS =
  'id, outlet_id, username, is_active, failed_attempts, locked_until, last_login_at, created_at, updated_at, outlet:outlets(id, name, is_active)';

// GET: all outlet accounts + outlets that don't have an account yet
export async function GET() {
  const supabase = await createAdminClient();
  const [usersRes, outletsRes] = await Promise.all([
    supabase.from('outlet_users').select(USER_COLUMNS).order('username'),
    fetchOutletsOrdered(supabase, { select: 'id, name, is_active' }),
  ]);

  if (isMissingTableError(usersRes.error)) {
    return NextResponse.json({ error: MIGRATION_MSG, migration_required: true }, { status: 503 });
  }
  if (usersRes.error || outletsRes.error) {
    return NextResponse.json({ error: 'Gagal memuat akun.' }, { status: 500 });
  }

  // List accounts in the same order as the Outlet menu (drag & drop order)
  const position = new Map((outletsRes.data ?? []).map((o, i) => [o.id, i]));
  const users = [...(usersRes.data ?? [])].sort(
    (a, b) => (position.get(a.outlet_id) ?? Infinity) - (position.get(b.outlet_id) ?? Infinity)
  );

  const withAccount = new Set(users.map((u) => u.outlet_id));
  return NextResponse.json({
    data: users,
    outlets_without_account: (outletsRes.data ?? []).filter((o) => !withAccount.has(o.id)),
    default_password: DEFAULT_OUTLET_PASSWORD,
  });
}

// POST: create one account { outlet_id, username?, password? } (username defaults to the outlet name without its number)
//       or every missing account at once { generate_missing: true }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const supabase = await createAdminClient();

  if (body.generate_missing) {
    const [usersRes, outletsRes] = await Promise.all([
      supabase.from('outlet_users').select('outlet_id, username'),
      supabase.from('outlets').select('id, name'),
    ]);
    if (isMissingTableError(usersRes.error)) {
      return NextResponse.json({ error: MIGRATION_MSG }, { status: 503 });
    }
    if (usersRes.error || outletsRes.error) {
      return NextResponse.json({ error: 'Gagal memuat data.' }, { status: 500 });
    }

    const takenOutlets = new Set((usersRes.data ?? []).map((u) => u.outlet_id));
    const takenNames = new Set((usersRes.data ?? []).map((u) => u.username.toLowerCase()));
    const missing = (outletsRes.data ?? []).filter(
      (o) => !takenOutlets.has(o.id) && !takenNames.has(defaultOutletUsername(o.name).toLowerCase())
    );
    if (missing.length === 0) return NextResponse.json({ data: { created: 0 } });

    const password_hash = await hashPin(DEFAULT_OUTLET_PASSWORD);
    const { error } = await supabase
      .from('outlet_users')
      .insert(missing.map((o) => ({ outlet_id: o.id, username: defaultOutletUsername(o.name), password_hash })));
    if (error) return NextResponse.json({ error: 'Gagal membuat akun.' }, { status: 500 });

    return NextResponse.json({ data: { created: missing.length } }, { status: 201 });
  }

  const { outlet_id, username, password } = body as { outlet_id?: string; username?: string; password?: string };
  if (!outlet_id) return NextResponse.json({ error: 'Outlet wajib dipilih.' }, { status: 400 });
  if (password !== undefined && password !== '' && password.length < 6) {
    return NextResponse.json({ error: 'Password minimal 6 karakter.' }, { status: 400 });
  }

  const { data: outlet } = await supabase.from('outlets').select('name').eq('id', outlet_id).single();
  if (!outlet) return NextResponse.json({ error: 'Outlet tidak ditemukan.' }, { status: 404 });

  const finalUsername = username?.trim() || defaultOutletUsername(outlet.name);
  const { data, error } = await supabase
    .from('outlet_users')
    .insert({
      outlet_id,
      username: finalUsername,
      password_hash: await hashPin(password || DEFAULT_OUTLET_PASSWORD),
    })
    .select(USER_COLUMNS)
    .single();

  if (error) {
    if (isMissingTableError(error)) return NextResponse.json({ error: MIGRATION_MSG }, { status: 503 });
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Outlet ini sudah punya akun, atau username sudah dipakai.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal membuat akun.' }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
