import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import type { Outlet } from '@/types';

/**
 * Outlets in the admin-defined order (sort_order, then name).
 * Before migration_outlet_sort_order.sql is applied the column doesn't exist,
 * so we fall back to ordering by name.
 */
export async function fetchOutletsOrdered<Row = Outlet>(
  supabase: SupabaseClient,
  { select = '*', activeOnly = false }: { select?: string; activeOnly?: boolean } = {}
): Promise<{ data: Row[] | null; error: PostgrestError | null }> {
  const build = () => {
    const q = supabase.from('outlets').select(select);
    return activeOnly ? q.eq('is_active', true) : q;
  };

  const ordered = await build()
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('name');
  const res = ordered.error?.code === '42703' ? await build().order('name') : ordered;

  return { data: res.data as Row[] | null, error: res.error };
}
