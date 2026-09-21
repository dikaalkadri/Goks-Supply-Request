import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { hashPin } from '@/lib/auth/pin';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { current_pin, new_pin } = body as { current_pin: string; new_pin: string };

  if (!new_pin || new_pin.length < 4 || new_pin.length > 20) {
    return NextResponse.json({ error: 'PIN baru minimal 4 karakter.' }, { status: 400 });
  }

  // Verify current PIN
  const { verifyAdminPin } = await import('@/lib/auth/pin');
  const valid = await verifyAdminPin(current_pin);
  if (!valid) {
    return NextResponse.json({ error: 'PIN saat ini tidak valid.' }, { status: 401 });
  }

  const hashed = await hashPin(new_pin);
  const supabase = createServerClient();

  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'admin_pin_hash', value: hashed, updated_at: new Date().toISOString() });

  if (error) {
    return NextResponse.json({ error: 'Gagal memperbarui PIN.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
