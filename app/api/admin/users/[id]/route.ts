import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { hashPin } from '@/lib/auth/pin';
import { DEFAULT_OUTLET_PASSWORD } from '@/lib/auth/outlet-session';

// PATCH: { username?, password?, reset_password?: true, is_active?, unlock?: true }
// Changing the password or deactivating bumps session_version, which logs out
// every device currently signed in with this account.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const supabase = await createAdminClient();

  const { data: current, error: fetchErr } = await supabase
    .from('outlet_users')
    .select('id, session_version, is_active')
    .eq('id', id)
    .single();
  if (fetchErr || !current) {
    return NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  let forceLogout = false;

  if (body.username !== undefined) {
    const username = String(body.username).trim();
    if (!username) return NextResponse.json({ error: 'Username wajib diisi.' }, { status: 400 });
    if (username.length > 100) return NextResponse.json({ error: 'Username terlalu panjang.' }, { status: 400 });
    update.username = username;
  }

  if (body.reset_password) {
    update.password_hash = await hashPin(DEFAULT_OUTLET_PASSWORD);
    forceLogout = true;
  } else if (body.password !== undefined) {
    const password = String(body.password);
    if (password.length < 6 || password.length > 100) {
      return NextResponse.json({ error: 'Password minimal 6 karakter.' }, { status: 400 });
    }
    update.password_hash = await hashPin(password);
    forceLogout = true;
  }

  if (body.is_active !== undefined) {
    update.is_active = Boolean(body.is_active);
    if (!update.is_active && current.is_active) forceLogout = true;
  }

  if (body.unlock || update.password_hash) {
    update.failed_attempts = 0;
    update.locked_until = null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Tidak ada data yang diubah.' }, { status: 400 });
  }
  if (forceLogout) update.session_version = current.session_version + 1;

  const { error } = await supabase.from('outlet_users').update(update).eq('id', id);
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Username sudah dipakai akun lain.' }, { status: 409 });
    return NextResponse.json({ error: 'Gagal memperbarui akun.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createAdminClient();
  const { error } = await supabase.from('outlet_users').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Gagal menghapus akun.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
