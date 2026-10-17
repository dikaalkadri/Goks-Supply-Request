// Date filters use Asia/Jakarta days (WIB, UTC+7, no DST), the same as request
// codes and the UI. created_at is stored in UTC, so a bare "YYYY-MM-DD" must be
// turned into WIB day boundaries; otherwise requests made 00:00–07:00 WIB fall
// on the previous day.

const WIB_OFFSET = '+07:00';
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Start of a WIB day as an ISO timestamp, or null for invalid input. */
export function startOfDayWIB(date: string | null | undefined): string | null {
  return date && DATE_RE.test(date) ? `${date}T00:00:00${WIB_OFFSET}` : null;
}

/** End of a WIB day as an ISO timestamp, or null for invalid input. */
export function endOfDayWIB(date: string | null | undefined): string | null {
  return date && DATE_RE.test(date) ? `${date}T23:59:59.999${WIB_OFFSET}` : null;
}

/** The WIB calendar date (YYYY-MM-DD) of a timestamp; defaults to now. */
export function dateWIB(at: string | Date = new Date()): string {
  return new Date(new Date(at).getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}
