import { NextResponse } from 'next/server';
import { clearOutletSession } from '@/lib/auth/outlet-session';

export async function POST() {
  await clearOutletSession();
  return NextResponse.json({ success: true });
}
