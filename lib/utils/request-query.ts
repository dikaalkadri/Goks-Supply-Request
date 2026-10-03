/**
 * Shared helpers for request list queries (public + admin).
 */

/**
 * Remove characters that have meaning in PostgREST filter syntax
 * (`,` `(` `)` `"` `\`) or act as LIKE wildcards (`%` `*`), so user input
 * can't break or widen the `.or(...)` search filter.
 */
export function sanitizeSearch(raw: string): string {
  return raw.replace(/[,()"'\\%*]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50);
}

/**
 * Embedded resources needed for the has_photo filter. `has_photo` refers to
 * item photos (request_items.photo_path); legacy condition photos are unused.
 */
export function mediaFilterSelect(hasPhoto: string): string {
  if (hasPhoto === 'yes') return ', ph:request_items!inner(id)';
  if (hasPhoto === 'no') return ', ph:request_items(id)';
  return '';
}

interface FilterableQuery<Q> {
  is(column: string, value: null): Q;
  not(column: string, operator: string, value: null): Q;
}

/**
 * Apply has_receipt / has_photo in the database (before pagination), so page
 * sizes and the total count stay correct.
 */
export function applyMediaFilters<Q extends FilterableQuery<Q>>(
  query: Q,
  hasReceipt: string,
  hasPhoto: string
): Q {
  let q = query;
  if (hasReceipt === 'yes') q = q.not('purchase_receipts', 'is', null);
  if (hasReceipt === 'no') q = q.is('purchase_receipts', null);
  if (hasPhoto === 'yes') q = q.not('ph.photo_path', 'is', null);
  if (hasPhoto === 'no') q = q.not('ph.photo_path', 'is', null).is('ph', null);
  return q;
}
