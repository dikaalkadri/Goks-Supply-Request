import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Server-side signed URL for Supabase Storage upload
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { bucket, path, token } = body as {
    bucket: string;
    path: string;
    token: string;
  };

  const allowedBuckets = ['request-condition-photos', 'request-receipts'];
  if (!allowedBuckets.includes(bucket)) {
    return NextResponse.json({ error: 'Bucket tidak valid.' }, { status: 400 });
  }
  if (!path || !token) {
    return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 });
  }

  // Validate token format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    return NextResponse.json({ error: 'Token tidak valid.' }, { status: 403 });
  }

  const supabase = await createAdminClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error('Signed URL error:', error);
    return NextResponse.json({ error: 'Gagal membuat upload URL.' }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, path: data.path });
}
