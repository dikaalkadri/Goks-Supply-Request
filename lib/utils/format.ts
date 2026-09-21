import { format, toZonedTime } from 'date-fns-tz';
import { id } from 'date-fns/locale';

const TZ = 'Asia/Jakarta';

/**
 * Format date to Indonesian long format: "21 September 2026"
 */
export function formatDateLong(dateStr: string): string {
  const zonedDate = toZonedTime(new Date(dateStr), TZ);
  return format(zonedDate, 'd MMMM yyyy', { locale: id });
}

/**
 * Format date + time: "21 September 2026, 16:32"
 */
export function formatDateTime(dateStr: string): string {
  const zonedDate = toZonedTime(new Date(dateStr), TZ);
  return format(zonedDate, "d MMMM yyyy, HH:mm", { locale: id });
}

/**
 * Format date for table/compact: "21 Sep 2026"
 */
export function formatDateShort(dateStr: string): string {
  const zonedDate = toZonedTime(new Date(dateStr), TZ);
  return format(zonedDate, 'd MMM yyyy', { locale: id });
}

/**
 * Format date for export: "21/09/2026"
 */
export function formatDateExport(dateStr: string): string {
  const zonedDate = toZonedTime(new Date(dateStr), TZ);
  return format(zonedDate, 'dd/MM/yyyy');
}

/**
 * Format time only: "16:32"
 */
export function formatTime(dateStr: string): string {
  const zonedDate = toZonedTime(new Date(dateStr), TZ);
  return format(zonedDate, 'HH:mm');
}

/**
 * Get today's date in YYMMDD format (Jakarta timezone)
 */
export function getTodayYYMMDD(): string {
  const zonedDate = toZonedTime(new Date(), TZ);
  return format(zonedDate, 'yyMMdd');
}

/**
 * Translate request status to Indonesian
 */
export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Menunggu',
    processing: 'Diproses',
    completed: 'Selesai',
    rejected: 'Ditolak',
  };
  return map[status] ?? status;
}

/**
 * Translate purchase status to Indonesian
 */
export function purchaseStatusLabel(status: string): string {
  const map: Record<string, string> = {
    not_purchased: 'Belum Dibeli',
    purchased: 'Sudah Dibeli',
  };
  return map[status] ?? status;
}
