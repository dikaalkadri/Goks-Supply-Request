'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardList, RotateCcw, ExternalLink, Search, X } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminPage from '@/components/admin/AdminPage';
import { LoadingState, EmptyState } from '@/components/ui/States';
import DateRangePicker from '@/components/ui/DateRangePicker';
import type { Outlet } from '@/types';

// ── Helpers ─────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');
const thisMonthRange = (): [string, string] => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  return [
    `${y}-${pad(m + 1)}-01`,
    `${y}-${pad(m + 1)}-${pad(last)}`,
  ];
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

// ── Label maps ───────────────────────────────────────────────────────────────

const ITEM_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Menunggu',  cls: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Selesai',   cls: 'bg-green-100  text-green-700' },
  rejected:  { label: 'Ditolak',   cls: 'bg-red-100    text-red-700' },
};

const PURCHASE_TYPE_LABEL: Record<string, { label: string; cls: string }> = {
  warehouse:  { label: '🏭 Warehouse',  cls: 'bg-blue-50   text-blue-700   border border-blue-200' },
  petty_cash: { label: '💵 Petty Cash', cls: 'bg-purple-50 text-purple-700 border border-purple-200' },
};

const REQUEST_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'Menunggu',  cls: 'bg-yellow-50 text-yellow-700' },
  processing: { label: 'Diproses', cls: 'bg-blue-50   text-blue-700'   },
  completed:  { label: 'Selesai',  cls: 'bg-green-50  text-green-700'  },
  rejected:   { label: 'Ditolak',  cls: 'bg-red-50    text-red-700'    },
};

// ── Types ────────────────────────────────────────────────────────────────────

interface PurchaseHistoryRow {
  id: string;
  item_id: string | null;
  item_name: string;
  qty: number;
  unit: string;
  is_manual: boolean;
  status: string | null;
  purchase_type: 'warehouse' | 'petty_cash' | null;
  admin_note: string | null;
  delivered_at: string | null;
  created_at: string;
  request: {
    id: string;
    request_code: string;
    status: string;
    created_at: string;
    outlet: { id: string; name: string } | null;
  } | null;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PurchaseHistoryPage() {
  const router = useRouter();

  // Default: this month
  const [defaultFrom, defaultTo] = thisMonthRange();
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo,   setDateTo]   = useState(defaultTo);
  const isDefaultRange = dateFrom === defaultFrom && dateTo === defaultTo;

  const [outlets,      setOutlets]      = useState<Outlet[]>([]);
  const [outletId,     setOutletId]     = useState('');
  const [purchaseType, setPurchaseType] = useState('');
  const [itemStatus,   setItemStatus]   = useState('');
  const [itemSource,   setItemSource]   = useState('');
  const [search,       setSearch]       = useState('');

  const [rows,    setRows]    = useState<PurchaseHistoryRow[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [page,    setPage]    = useState(1);
  const limit = 50;

  // Load outlets once
  useEffect(() => {
    fetch('/api/outlets')
      .then(r => r.json())
      .then(d => setOutlets(d.data ?? []));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (outletId)     p.set('outlet_id',    outletId);
      if (purchaseType) p.set('purchase_type', purchaseType);
      if (itemStatus)   p.set('item_status',   itemStatus);
      if (itemSource)   p.set('item_source',   itemSource);
      if (dateFrom)     p.set('date_from',     dateFrom);
      if (dateTo)       p.set('date_to',       dateTo);
      if (search.trim()) p.set('search',       search.trim());

      const res  = await fetch(`/api/admin/purchase-history?${p}`);
      const data = await res.json();
      setRows(data.data ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [outletId, purchaseType, itemStatus, itemSource, dateFrom, dateTo, search, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReset = () => {
    const [f, t] = thisMonthRange();
    setDateFrom(f);
    setDateTo(t);
    setOutletId('');
    setPurchaseType('');
    setItemStatus('');
    setItemSource('');
    setSearch('');
    setPage(1);
  };

  const hasNonDefaultFilter =
    outletId || purchaseType || itemStatus || itemSource || search ||
    (dateFrom !== defaultFrom || dateTo !== defaultTo);

  const totalQtyByUnit: Record<string, number> = {};
  rows.forEach(r => {
    totalQtyByUnit[r.unit] = (totalQtyByUnit[r.unit] ?? 0) + Number(r.qty);
  });

  return (
    <AdminLayout>
      <AdminPage
        title="Riwayat Pembelian Supply Request"
        subtitle="Pantau seluruh item yang diajukan outlet, kategori pembelian, dan statusnya."
      >

        {/* ── Filter Bar ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 space-y-3">
          {/* Row 1 */}
          <div className="flex flex-wrap gap-3 items-end">

            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Cari</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nama barang, kode SR, atau outlet..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                />
                {search && (
                  <button
                    onClick={() => { setSearch(''); setPage(1); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Outlet */}
            <div className="min-w-[180px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Outlet</label>
              <select
                value={outletId}
                onChange={e => { setOutletId(e.target.value); setPage(1); }}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              >
                <option value="">Semua Outlet</option>
                {outlets.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>

            {/* Periode */}
            <div className="min-w-[220px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Periode</label>
              <DateRangePicker
                dateFrom={dateFrom}
                dateTo={dateTo}
                onChange={(from, to) => { setDateFrom(from); setDateTo(to); setPage(1); }}
                isDefault={isDefaultRange}
                defaultLabel="Bulan Ini"
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="flex flex-wrap gap-3 items-end">
            {/* Tipe Pembelian */}
            <div className="min-w-[170px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tipe Pembelian</label>
              <select
                value={purchaseType}
                onChange={e => { setPurchaseType(e.target.value); setPage(1); }}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              >
                <option value="">Semua Tipe</option>
                <option value="warehouse">🏭 Warehouse</option>
                <option value="petty_cash">💵 Petty Cash</option>
              </select>
            </div>

            {/* Status Item */}
            <div className="min-w-[160px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Status Item</label>
              <select
                value={itemStatus}
                onChange={e => { setItemStatus(e.target.value); setPage(1); }}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              >
                <option value="">Semua Status</option>
                <option value="pending">🟡 Menunggu</option>
                <option value="completed">🟢 Selesai</option>
                <option value="rejected">🔴 Ditolak</option>
              </select>
            </div>

            {/* Sumber Item */}
            <div className="min-w-[160px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Sumber Item</label>
              <select
                value={itemSource}
                onChange={e => { setItemSource(e.target.value); setPage(1); }}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              >
                <option value="">Semua Sumber</option>
                <option value="master">📦 Master Produk</option>
                <option value="manual">✏️ Input Manual</option>
              </select>
            </div>

            {/* Reset */}
            {hasNonDefaultFilter && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 text-sm text-red-600 bg-red-50 hover:bg-red-100 transition-colors font-medium self-end"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* ── Summary Chips ── */}
        {!loading && rows.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full text-xs font-semibold text-indigo-700">
              <ClipboardList className="h-3.5 w-3.5" />
              {total} item ditemukan
            </div>
            {Object.entries(totalQtyByUnit).map(([unit, qty]) => (
              <div key={unit} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full text-xs font-semibold text-green-700">
                Total: {qty} {unit}
              </div>
            ))}
            {outletId && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-xs font-semibold text-gray-600">
                📍 {outlets.find(o => o.id === outletId)?.name ?? outletId}
              </div>
            )}
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <LoadingState text="Memuat riwayat pembelian..." />
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="h-8 w-8 text-indigo-400" />
            </div>
            <p className="text-gray-500 font-medium">Tidak ada data ditemukan</p>
            <p className="text-sm text-gray-400 mt-1">Coba ubah filter atau rentang tanggal</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {rows.map((row, i) => {
                const targetUrl = row.request?.id ? `/admin/requests/${row.request.id}` : null;
                const isManual  = !row.item_id || row.is_manual;

                const CardContent = (
                  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 transition-all ${targetUrl ? 'hover:border-primary-300 hover:shadow-md cursor-pointer active:scale-[0.99]' : ''}`}>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5 truncate">
                          <span className="text-gray-400 font-medium tabular-nums mr-0.5">{(page - 1) * limit + i + 1}.</span>
                          <span className="truncate">{row.item_name}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${isManual ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'}`}>
                            {isManual ? '✏️ Manual' : '📦 Master'}
                          </span>
                          {row.request?.request_code && (
                            <span className="text-xs font-bold text-primary-700 flex items-center gap-0.5">
                              {row.request.request_code}
                              {targetUrl && <ExternalLink className="h-3 w-3 text-gray-400" />}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Badges */}
                      <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
                        {row.status && ITEM_STATUS_LABEL[row.status] && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ITEM_STATUS_LABEL[row.status].cls}`}>
                            {ITEM_STATUS_LABEL[row.status].label}
                          </span>
                        )}
                        {row.purchase_type && PURCHASE_TYPE_LABEL[row.purchase_type] ? (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${PURCHASE_TYPE_LABEL[row.purchase_type].cls}`}>
                            {PURCHASE_TYPE_LABEL[row.purchase_type].label}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-400">-</span>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                      <div>
                        <p className="text-xs font-medium text-gray-600">{row.request?.outlet?.name ?? '-'}</p>
                        <p className="text-[11px] text-gray-400">{fmtDate(row.request?.created_at ?? row.created_at)}</p>
                      </div>
                      <p className="font-bold text-gray-900 text-base">
                        {row.qty} <span className="text-xs font-normal text-gray-500">{row.unit}</span>
                      </p>
                    </div>

                    {row.admin_note && (
                      <p className="text-xs text-gray-400 italic mt-2 bg-gray-50 rounded-lg px-2 py-1.5">
                        Catatan: {row.admin_note}
                      </p>
                    )}
                  </div>
                );

                return targetUrl ? (
                  <Link key={row.id} href={targetUrl} className="block no-underline">{CardContent}</Link>
                ) : (
                  <div key={row.id}>{CardContent}</div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-right pl-4 pr-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">No</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tanggal</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kode SR</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Outlet</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nama Item</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Satuan</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sumber</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipe Beli</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status Item</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status SR</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const targetUrl = row.request?.id ? `/admin/requests/${row.request.id}` : null;
                      const isManual  = !row.item_id || row.is_manual;

                      return (
                        <tr
                          key={row.id}
                          onClick={() => { if (targetUrl) router.push(targetUrl); }}
                          className={`border-b border-gray-50 transition-colors ${
                            targetUrl ? 'hover:bg-primary-50/50 cursor-pointer' : 'hover:bg-gray-50/60'
                          }`}
                        >
                          {/* No */}
                          <td className="pl-4 pr-2 py-3 text-right text-gray-400 tabular-nums text-xs">{(page - 1) * limit + i + 1}</td>

                          {/* Tanggal */}
                          <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                            {fmtDate(row.request?.created_at ?? row.created_at)}
                          </td>

                          {/* Kode SR */}
                          <td className="px-4 py-3">
                            <span className="font-bold text-primary-700 text-xs">{row.request?.request_code ?? '-'}</span>
                          </td>

                          {/* Outlet */}
                          <td className="px-4 py-3 text-gray-700 font-medium text-xs whitespace-nowrap">
                            {row.request?.outlet?.name ?? '-'}
                          </td>

                          {/* Nama Item */}
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{row.item_name}</p>
                            {row.admin_note && (
                              <p className="text-[11px] text-gray-400 italic mt-0.5 truncate max-w-[240px]">{row.admin_note}</p>
                            )}
                          </td>

                          {/* Qty */}
                          <td className="px-4 py-3 text-right font-bold text-gray-900">{row.qty}</td>

                          {/* Satuan */}
                          <td className="px-4 py-3 text-gray-500 text-xs">{row.unit}</td>

                          {/* Sumber */}
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                              isManual ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'
                            }`}>
                              {isManual ? '✏️ Manual' : '📦 Master'}
                            </span>
                          </td>

                          {/* Tipe Pembelian */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {row.purchase_type && PURCHASE_TYPE_LABEL[row.purchase_type] ? (
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PURCHASE_TYPE_LABEL[row.purchase_type].cls}`}>
                                {PURCHASE_TYPE_LABEL[row.purchase_type].label}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>

                          {/* Status Item */}
                          <td className="px-4 py-3 text-center">
                            {row.status && ITEM_STATUS_LABEL[row.status] ? (
                              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${ITEM_STATUS_LABEL[row.status].cls}`}>
                                {ITEM_STATUS_LABEL[row.status].label}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>

                          {/* Status SR */}
                          <td className="px-4 py-3 text-center">
                            {row.request?.status && REQUEST_STATUS_LABEL[row.request.status] ? (
                              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${REQUEST_STATUS_LABEL[row.request.status].cls}`}>
                                {REQUEST_STATUS_LABEL[row.request.status].label}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>

                          {/* Aksi */}
                          <td className="px-4 py-3 text-center">
                            {targetUrl && (
                              <Link
                                href={targetUrl}
                                onClick={e => e.stopPropagation()}
                                className="inline-flex items-center justify-center p-1.5 rounded-lg text-primary-600 hover:text-primary-700 hover:bg-primary-50 transition-colors"
                                title="Buka detail Supply Request"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-5 pt-3 border-t border-gray-100">
                <div className="text-xs sm:text-sm text-gray-500 font-medium">
                  Menampilkan <span className="font-semibold text-gray-700">{(page - 1) * limit + 1}</span>–<span className="font-semibold text-gray-700">{Math.min(page * limit, total)}</span> dari <span className="font-semibold text-gray-700">{total}</span> item
                </div>

                {total > limit && (
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Sebelumnya
                    </button>
                    <span className="px-2 text-xs sm:text-sm text-gray-500 font-medium">
                      Halaman <span className="font-semibold text-gray-700">{page}</span> dari <span className="font-semibold text-gray-700">{Math.ceil(total / limit)}</span>
                    </span>
                    <button
                      disabled={page >= Math.ceil(total / limit)}
                      onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                      className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Selanjutnya →
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </AdminPage>
    </AdminLayout>
  );
}
