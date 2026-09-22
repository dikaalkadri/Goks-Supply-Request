import { createServerClient } from '@/lib/supabase/server';
import { getTodayYYMMDD } from '@/lib/utils/format';

/**
 * Generate a unique request code in format REQ-YYMMDD-XXX
 * Sequential per day, atomic via DB query
 */
export async function generateRequestCode(): Promise<string> {
  const supabase = await createServerClient();
  const dateStr = getTodayYYMMDD();
  const prefix = `REQ-${dateStr}-`;

  // Find the highest sequence number for today
  const { data } = await supabase
    .from('requests')
    .select('request_code')
    .like('request_code', `${prefix}%`)
    .order('request_code', { ascending: false })
    .limit(1);

  let nextSeq = 1;
  if (data && data.length > 0) {
    const lastCode = data[0].request_code;
    const lastSeq = parseInt(lastCode.replace(prefix, ''), 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  const seqStr = String(nextSeq).padStart(3, '0');
  return `${prefix}${seqStr}`;
}
