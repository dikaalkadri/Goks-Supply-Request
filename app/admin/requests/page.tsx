'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, Trash2, Edit, CalendarRange, Download, X, ChevronLeft, ChevronRight } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Button from '@/components/ui/Button';
import type { Request, Outlet } from '@/types';
import { formatDateShort, formatTime } from '@/lib/utils/format';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

// ─── Date Range Picker ──────────────────────────────────────────────
const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAYS_ID = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

function DateRangePicker({
  dateFrom, dateTo,
  onChange,
}: {
  dateFrom: string; dateTo: string;
  onChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState<string>('');
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayLabel = () => {
    if (!dateFrom && !dateTo) return 'Pilih rentang tanggal';
    const fmt = (d: string) => {
      const [y, m, day] = d.split('-');
      return `${day}/${m}/${y}`;
    };
    if (dateFrom && dateTo) return `${fmt(dateFrom)} - ${fmt(dateTo)}`;
    if (dateFrom) return `${fmt(dateFrom)} - ...`;
    return '';
  };

  const buildDays = () => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (string | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const m = String(viewMonth + 1).padStart(2, '0');
      const day = String(d).padStart(2, '0');
      cells.push(`${viewYear}-${m}-${day}`);
    }
    return cells;
  };

  const handleDayClick = (date: string) => {
    if (!dateFrom || (dateFrom && dateTo)) {
      onChange(date, '');
    } else {
      if (date < dateFrom) {
        onChange(date, dateFrom);
      } else {
        onChange(dateFrom, date);
      }
      setOpen(false);
    }
  };

  const isInRange = (date: string) => {
    const from = dateFrom;
    const to = dateTo || hoverDate;
    if (!from || !to) return false;
    const [lo, hi] = from <= to ? [from, to] : [to, from];
    return date > lo && date < hi;
  };

  const isStart = (date: string) => date === dateFrom;
  const isEnd = (date: string) => !!dateTo && date === dateTo || (!dateTo && date === hoverDate && dateFrom);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const days = buildDays();

  return (
    <div ref={ref} className="relative col-span-2 sm:col-span-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors bg-white w-full ${
          (dateFrom || dateTo) ? 'border-primary-400 text-primary-700 font-medium' : 'border-gray-200 text-gray-500'
        }`}
      >
        <CalendarRange className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left truncate">{displayLabel()}</span>
        {(dateFrom || dateTo) && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onChange('', ''); }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-2 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-72 select-none">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>
            <span className="text-sm font-semibold text-gray-800">
              {MONTHS_ID[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAYS_ID.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {days.map((date, i) =>
              date === null ? (
                <div key={`empty-${i}`} />
              ) : (
                <button
                  key={date}
                  type="button"
                  onClick={() => handleDayClick(date)}
                  onMouseEnter={() => { if (dateFrom && !dateTo) setHoverDate(date); }}
                  onMouseLeave={() => setHoverDate('')}
                  className={`text-xs py-1.5 rounded-lg transition-colors font-medium ${
                    isStart(date) || isEnd(date)
                      ? 'bg-primary-600 text-white'
                      : isInRange(date)
                      ? 'bg-primary-100 text-primary-800'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {parseInt(date.split('-')[2])}
                </button>
              )
            )}
          </div>

          <p className="text-[10px] text-gray-400 text-center mt-3">
            {!dateFrom ? 'Pilih tanggal mulai' : !dateTo ? 'Pilih tanggal akhir' : displayLabel()}
          </p>
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [search, setSearch] = useState('');
  const [filterOutlet, setFilterOutlet] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPurchase, setFilterPurchase] = useState('');
  const [filterReceipt, setFilterReceipt] = useState('');
  const [filterPhoto, setFilterPhoto] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch('/api/admin/outlets').then((r) => r.json()).then((d) => setOutlets(d.data ?? []));
  }, []);

  // Apply filters from the URL (links from dashboard cards, e.g. ?status=pending)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('outlet_id')) setFilterOutlet(q.get('outlet_id')!);
    if (q.get('status')) setFilterStatus(q.get('status')!);
    if (q.get('purchase_status')) setFilterPurchase(q.get('purchase_status')!);
    if (q.get('has_receipt')) setFilterReceipt(q.get('has_receipt')!);
    if (q.get('has_photo')) setFilterPhoto(q.get('has_photo')!);
    if ([...q.keys()].length > 0) setShowFilters(true);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterOutlet) params.set('outlet_id', filterOutlet);
      if (filterStatus) params.set('status', filterStatus);
      if (filterPurchase) params.set('purchase_status', filterPurchase);
      if (filterReceipt) params.set('has_receipt', filterReceipt);
      if (filterPhoto) params.set('has_photo', filterPhoto);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`/api/admin/requests?${params}`);
      const data = await res.json();
      setRequests(data.data ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [search, filterOutlet, filterStatus, filterPurchase, filterReceipt, filterPhoto, dateFrom, dateTo, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/requests/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Permintaan berhasil dihapus.');
      setDeleteId(null);
      fetchData();
    } catch {
      toast.error('Gagal menghapus permintaan.');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filterOutlet) params.set('outlet_id', filterOutlet);
      if (filterStatus) params.set('status', filterStatus);
      if (filterPurchase) params.set('purchase_status', filterPurchase);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const res = await fetch(`/api/admin/export?${params}`);
      const { data } = await res.json();

      if (!data || data.length === 0) {
        toast.error('Tidak ada data untuk di-export.');
        return;
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Permintaan Barang');
      const colWidths = Object.keys(data[0]).map((key: string) => ({
        wch: Math.max(key.length, ...data.map((r: Record<string, unknown>) => String(r[key]).length)),
      }));
      ws['!cols'] = colWidths;
      const ts = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `permintaan-barang-${ts}.xlsx`);
      toast.success('Export berhasil!');
    } catch {
      toast.error('Gagal export data.');
    } finally {
      setExporting(false);
    }
  };

  const hasFilters = filterOutlet || filterStatus || filterPurchase || filterReceipt || filterPhoto || dateFrom || dateTo;

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Permintaan</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} permintaan</p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleExport} loading={exporting}>
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-4 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
              <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Cari kode, pengaju..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="flex-1 bg-transparent text-sm focus:outline-none text-gray-700 placeholder:text-gray-400"
              />
              {search && <button onClick={() => setSearch('')}><X className="h-4 w-4 text-gray-400" /></button>}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${hasFilters ? 'bg-primary-100 text-primary-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filter {hasFilters && '●'}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-2 border-t border-gray-100">
              <select value={filterOutlet} onChange={(e) => { setFilterOutlet(e.target.value); setPage(1); }} className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none bg-white">
                <option value="">Semua Outlet</option>
                {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none bg-white">
                <option value="">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="completed">Selesai</option>
                <option value="rejected">Ditolak</option>
              </select>
              <select value={filterPurchase} onChange={(e) => { setFilterPurchase(e.target.value); setPage(1); }} className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none bg-white">
                <option value="">Semua Pembelian</option>
                <option value="not_purchased">Belum Dibeli</option>
                <option value="purchased">Sudah Dibeli</option>
              </select>
              <select value={filterReceipt} onChange={(e) => { setFilterReceipt(e.target.value); setPage(1); }} className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none bg-white">
                <option value="">Semua Nota</option>
                <option value="yes">Ada Nota</option>
                <option value="no">Tanpa Nota</option>
              </select>
              <select value={filterPhoto} onChange={(e) => { setFilterPhoto(e.target.value); setPage(1); }} className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none bg-white">
                <option value="">Semua Foto</option>
                <option value="yes">Ada Foto Barang</option>
                <option value="no">Tanpa Foto Barang</option>
              </select>
              <DateRangePicker
                dateFrom={dateFrom}
                dateTo={dateTo}
                onChange={(from, to) => { setDateFrom(from); setDateTo(to); setPage(1); }}
              />
              {hasFilters && (
                <button
                  onClick={() => { setFilterOutlet(''); setFilterStatus(''); setFilterPurchase(''); setFilterReceipt(''); setFilterPhoto(''); setDateFrom(''); setDateTo(''); setPage(1); }}
                  className="px-3 py-2 rounded-xl border border-red-200 text-sm text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  Reset Filter
                </button>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <LoadingState />
        ) : requests.length === 0 ? (
          <EmptyState title="Belum ada permintaan barang." />
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {requests.map((req) => (
                <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-primary-700 text-sm">{req.request_code}</p>
                      <p className="text-xs text-gray-500">{formatDateShort(req.created_at)}</p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{req.outlet?.name}</p>
                  <p className="text-xs text-gray-500">{req.requester_name} · {req.request_items?.length ?? 0} barang</p>
                  <div className="flex gap-2 mt-3">
                    <Link href={`/admin/requests/${req.id}`}>
                      <button className="flex-1 py-1.5 px-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center justify-center gap-1">
                        <Edit className="h-3.5 w-3.5" /> Detail/Edit
                      </button>
                    </Link>
                    <button
                      onClick={() => setDeleteId(req.id)}
                      className="py-1.5 px-3 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium text-red-600 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kode</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tanggal</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Outlet</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pengaju</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Barang</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nota</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => (
                      <tr key={req.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-bold text-primary-700">{req.request_code}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {formatDateShort(req.created_at)}<br/>{formatTime(req.created_at)}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{req.outlet?.name ?? '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{req.requester_name}</td>
                        <td className="px-4 py-3 text-right text-gray-700 font-semibold">{req.request_items?.length ?? 0}</td>
                        <td className="px-4 py-3 text-center"><StatusBadge status={req.status} /></td>
                        <td className="px-4 py-3 text-center">
                          {(req.purchase_receipts?.length ?? 0) > 0 ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Ada</span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <Link href={`/admin/requests/${req.id}`}>
                              <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-600">
                                <Edit className="h-4 w-4" />
                              </button>
                            </Link>
                            <button
                              onClick={() => setDeleteId(req.id)}
                              className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {total > limit && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Sebelumnya</Button>
                <span className="text-sm text-gray-500">Hal {page} / {Math.ceil(total / limit)}</span>
                <Button variant="secondary" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage((p) => p + 1)}>Selanjutnya →</Button>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Hapus Permintaan"
        message="Permintaan ini akan dihapus secara permanen beserta semua data barang, foto kondisi, dan nota. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Hapus"
      />
    </AdminLayout>
  );
}
