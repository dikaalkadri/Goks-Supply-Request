'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, Trash2, Edit, Eye, Download, X } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { StatusBadge, PurchaseStatusBadge } from '@/components/ui/StatusBadge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Button from '@/components/ui/Button';
import type { Request, Outlet } from '@/types';
import { formatDateShort, formatTime } from '@/lib/utils/format';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

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
                <option value="processing">Diproses</option>
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
                <option value="yes">Ada Foto Kondisi</option>
                <option value="no">Tanpa Foto Kondisi</option>
              </select>
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none bg-white" placeholder="Dari tanggal" />
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none bg-white" placeholder="Sampai tanggal" />
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
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={req.status} />
                      <PurchaseStatusBadge status={req.purchase_status} />
                    </div>
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
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Request</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pembelian</th>
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
                        <td className="px-4 py-3 text-center"><PurchaseStatusBadge status={req.purchase_status} /></td>
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
