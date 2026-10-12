import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Server-side signed URL for Supabase Storage upload
// Anyone who knows the request_id (i.e. has the link) can upload
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { bucket, path, request_id } = body as {
    bucket: string;
    path: string;
    request_id: string;
  };

  const allowedBuckets = ['request-condition-photos', 'request-receipts'];
  if (!allowedBuckets.includes(bucket)) {
    return NextResponse.json({ error: 'Bucket tidak valid.' }, { status: 400 });
  }
  if (!path || !request_id) {
    return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 });
  }

  // Validate request_id is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(request_id)) {
    return NextResponse.json({ error: 'Request ID tidak valid.' }, { status: 400 });
  }

  const supabase = await createAdminClient();

  // Verify the request exists
  const { error: fetchErr } = await supabase
    .from('requests')
    .select('id')
    .eq('id', request_id)
    .single();

  if (fetchErr) {
    return NextResponse.json({ error: 'Permintaan tidak ditemukan.' }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error('Signed URL error:', error);
    return NextResponse.json({ error: 'Gagal membuat upload URL.' }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, path: data.path });
}
