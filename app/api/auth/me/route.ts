import { NextResponse } from 'next/server';
import { getOutletSession } from '@/lib/auth/outlet-session';

// GET: the logged-in outlet, or { data: null } in public mode
export async function GET() {
  const session = await getOutletSession();
  return NextResponse.json(
    { data: session && { username: session.username, outlet_id: session.outlet_id, outlet_name: session.outlet_name } },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
