import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPin } from '@/lib/auth/pin';
import { setAdminSession } from '@/lib/auth/admin-session';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { pin } = body as { pin: string };

  if (!pin || typeof pin !== 'string' || pin.length < 4 || pin.length > 20) {
    return NextResponse.json({ error: 'PIN tidak valid.' }, { status: 400 });
  }

  const valid = await verifyAdminPin(pin);

  if (!valid) {
    return NextResponse.json({ error: 'PIN tidak valid.' }, { status: 401 });
  }

  await setAdminSession();
  return NextResponse.json({ success: true });
}
