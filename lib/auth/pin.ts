import bcrypt from 'bcryptjs';
import { createAdminClient } from '@/lib/supabase/server';

export async function verifyAdminPin(pin: string): Promise<boolean> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'admin_pin_hash')
    .single();

  if (error || !data) return false;

  return bcrypt.compare(pin, data.value);
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12);
}
