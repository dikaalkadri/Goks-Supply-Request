import * as XLSX from 'xlsx';
import type { Request, ExportRow } from '@/types';
import { formatDateExport, statusLabel, purchaseStatusLabel } from './format';

export function exportRequestsToExcel(requests: Request[]): void {
  const rows: ExportRow[] = [];

  for (const req of requests) {
    const items = req.request_items ?? [];
    const hasReceipt = (req.purchase_receipts?.length ?? 0) > 0;
    const outletName = req.outlet?.name ?? '-';

    if (items.length === 0) {
      rows.push({
        'Kode Request': req.request_code,
        Tanggal: formatDateExport(req.created_at),
        Outlet: outletName,
        Pengaju: req.requester_name,
        Barang: '-',
        Qty: 0,
        Satuan: '-',
        Tipe: '-',
        'Status Request': statusLabel(req.status),
        'Status Pembelian': purchaseStatusLabel(req.purchase_status),
        'Ada Nota': hasReceipt ? 'Ya' : 'Tidak',
        Catatan: req.note ?? '',
      });
    } else {
      for (const item of items) {
        rows.push({
          'Kode Request': req.request_code,
          Tanggal: formatDateExport(req.created_at),
          Outlet: outletName,
          Pengaju: req.requester_name,
          Barang: item.item_name,
          Qty: item.qty,
          Satuan: item.unit,
          Tipe: item.is_manual ? 'Manual' : 'Master',
          'Status Request': statusLabel(req.status),
          'Status Pembelian': purchaseStatusLabel(req.purchase_status),
          'Ada Nota': hasReceipt ? 'Ya' : 'Tidak',
          Catatan: req.note ?? '',
        });
      }
    }
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Permintaan Barang');

  // Auto column width
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.max(
      key.length,
      ...rows.map((r) => String(r[key as keyof ExportRow]).length)
    ),
  }));
  ws['!cols'] = colWidths;

  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `permintaan-barang-${timestamp}.xlsx`);
}
