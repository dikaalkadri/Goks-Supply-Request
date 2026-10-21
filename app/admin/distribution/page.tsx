'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart2, CalendarRange, X, ChevronLeft, ChevronRight, Search, RotateCcw, ExternalLink } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminPage from '@/components/admin/AdminPage';
import { LoadingState, EmptyState } from '@/components/ui/States';
import type { Item } from '@/types';

import DateRangePicker from '@/components/ui/DateRangePicker';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending:   { label: '🟡 Menunggu',  cls: 'bg-yellow-100 text-yellow-700' },
  completed: { label: '🟢 Selesai',   cls: 'bg-green-100 text-green-700'  },
  rejected:  { label: '🔴 Ditolak',   cls: 'bg-red-100 text-red-700'      },
};

const PURCHASE_TYPE_LABEL: Record<string, { label: string; cls: string }> = {
  warehouse:  { label: '🏭 Warehouse',  cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  petty_cash: { label: '💵 Petty Cash', cls: 'bg-purple-50 text-purple-700 border border-purple-200' },
};

interface DistributionRow {
  id: string;
  item_name: string;
  qty: number;
  unit: string;
  status: string;
  purchase_type: 'warehouse' | 'petty_cash' | null;
  delivered_at: string | null;
  created_at: string;
  request: {
    id: string;
    request_code: string;
    created_at: string;
    outlet: { id: string; name: string } | null;
  } | null;
}

export default function DistributionPage() {
  const router = useRouter();
  const [items,    setItems]    = useState<Item[]>([]);
  const [itemId,   setItemId]   = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [purchaseType, setPurchaseType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [rows,     setRows]     = useState<DistributionRow[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [page,     setPage]     = useState(1);
  const limit = 50;
  const itemRef = useRef<HTMLDivElement>(null);

  // Load master items
  useEffect(() => {
    fetch('/api/admin/items?limit=500')
      .then(r => r.json())
      .then(d => setItems(d.data ?? []));
  }, []);

  // Close item dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) setShowItemDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selectedItem = items.find(i => i.id === itemId);

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const fetchData = useCallback(async () => {
    if (!itemId) { setRows([]); setTotal(0); return; }
    setLoading(true);
    try {
      const p = new URLSearchParams({ item_id: itemId, page: String(page), limit: String(limit) });
      if (purchaseType) p.set('purchase_type', purchaseType);
      if (dateFrom)     p.set('date_from', dateFrom);
      if (dateTo)       p.set('date_to', dateTo);
      const res  = await fetch(`/api/admin/distribution?${p}`);
      const data = await res.json();
      setRows(data.data ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [itemId, purchaseType, dateFrom, dateTo, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReset = () => {
    setItemId('');
    setItemSearch('');
    setPurchaseType('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasFilter = itemId || purchaseType || dateFrom || dateTo;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <AdminLayout>
      <AdminPage title="Distribusi Barang" subtitle="Lihat distribusi barang ke outlet berdasarkan periode.">

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end">
          {/* Item Search Dropdown */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Pilih Barang</label>
            <div ref={itemRef} className="relative">
              <button
                type="button"
                onClick={() => setShowItemDropdown(o => !o)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm bg-white w-full transition-colors text-left ${
                  itemId ? 'border-primary-400 text-gray-900 font-medium' : 'border-gray-200 text-gray-400 hover:border-gray-300'
                }`}
              >
                <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="flex-1 truncate">{selectedItem ? selectedItem.name : 'Cari & pilih barang...'}</span>
                {itemId && (
                  <span role="button" onClick={(e) => { e.stopPropagation(); setItemId(''); setItemSearch(''); }}
                    className="text-gray-400 hover:text-gray-600">
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>

              {showItemDropdown && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="p-2 border-b border-gray-100">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Cari barang..."
                      value={itemSearch}
                      onChange={e => setItemSearch(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {filteredItems.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">Tidak ada barang ditemukan</p>
                    ) : filteredItems.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => { setItemId(item.id); setItemSearch(''); setShowItemDropdown(false); setPage(1); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between gap-2 ${
                          item.id === itemId ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
                        }`}
                      >
                        <span>{item.name}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">{item.unit}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filter Tipe Pengiriman (Warehouse / Petty Cash) */}
          <div className="min-w-[170px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tipe Pengiriman</label>
            <select
              value={purchaseType}
              onChange={(e) => { setPurchaseType(e.target.value); setPage(1); }}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            >
              <option value="">Semua Tipe</option>
              <option value="warehouse">🏭 Warehouse</option>
              <option value="petty_cash">💵 Petty Cash</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="min-w-[220px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Periode</label>
            <DateRangePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChange={(from, to) => { setDateFrom(from); setDateTo(to); setPage(1); }}
            />
          </div>

          {/* Reset */}
          {hasFilter && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 text-sm text-red-600 bg-red-50 hover:bg-red-100 transition-colors font-medium self-end"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Filter
            </button>
          )}
        </div>

        {/* Summary chip */}
        {!loading && rows.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full text-xs font-semibold text-indigo-700">
              <BarChart2 className="h-3.5 w-3.5" />
              {total} distribusi ditemukan
            </div>
            {selectedItem && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-xs font-semibold text-gray-600">
                {selectedItem.name} · {selectedItem.unit}
              </div>
            )}
            {purchaseType && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-full text-xs font-semibold text-purple-700">
                {PURCHASE_TYPE_LABEL[purchaseType]?.label ?? purchaseType}
              </div>
            )}
            {/* Total qty */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full text-xs font-semibold text-green-700">
              Total: {rows.reduce((s, r) => s + Number(r.qty), 0)} {rows[0]?.unit ?? ''}
            </div>
          </div>
        )}

        {/* Table */}
        {!itemId ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart2 className="h-8 w-8 text-indigo-400" />
            </div>
            <p className="text-gray-500 font-medium">Pilih barang untuk melihat distribusinya</p>
            <p className="text-sm text-gray-400 mt-1">Gunakan filter di atas untuk memilih barang dan periode</p>
          </div>
        ) : loading ? (
          <LoadingState text="Memuat data distribusi..." />
        ) : rows.length === 0 ? (
          <EmptyState title="Tidak ada data distribusi pada periode ini." />
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {rows.map((row, i) => {
                const targetUrl = row.request?.id ? `/admin/requests/${row.request.id}` : null;
                const CardContent = (
                  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 transition-all ${targetUrl ? 'hover:border-primary-300 hover:shadow-md cursor-pointer active:scale-[0.99]' : ''}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                          <span className="text-gray-400 font-medium tabular-nums mr-0.5">{(page - 1) * limit + i + 1}.</span>
                          <span>{row.request?.outlet?.name ?? '-'}</span>
                          {targetUrl && <ExternalLink className="h-3.5 w-3.5 text-gray-400 inline" />}
                        </p>
                        <p className="text-xs font-semibold text-primary-700">{row.request?.request_code}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {row.status && STATUS_LABEL[row.status] && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABEL[row.status].cls}`}>
                            {STATUS_LABEL[row.status].label}
                          </span>
                        )}
                        {row.purchase_type && PURCHASE_TYPE_LABEL[row.purchase_type] ? (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PURCHASE_TYPE_LABEL[row.purchase_type].cls}`}>
                            {PURCHASE_TYPE_LABEL[row.purchase_type].label}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
                            -
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 font-medium">{row.item_name}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">{fmtDate(row.request?.created_at ?? row.created_at)}</p>
                      <p className="font-bold text-gray-900">{row.qty} <span className="font-normal text-gray-500 text-xs">{row.unit}</span></p>
                    </div>
                    {row.delivered_at && (
                      <p className="text-xs text-gray-400 mt-1">Terkirim: {fmtDate(row.delivered_at)}</p>
                    )}
                  </div>
                );

                return targetUrl ? (
                  <Link key={row.id} href={targetUrl} className="block no-underline">
                    {CardContent}
                  </Link>
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
                      <th className="text-right pl-4 pr-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">No</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tanggal Distribusi</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kode Permintaan</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nama Barang</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Outlet</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Jumlah</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Satuan</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipe</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tgl Pengiriman</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const targetUrl = row.request?.id ? `/admin/requests/${row.request.id}` : null;
                      return (
                        <tr
                          key={row.id}
                          onClick={() => { if (targetUrl) router.push(targetUrl); }}
                          className={`border-b border-gray-50 transition-colors ${
                            targetUrl ? 'hover:bg-primary-50/50 cursor-pointer' : 'hover:bg-gray-50/60'
                          }`}
                        >
                          <td className="pl-4 pr-2 py-3 text-right text-gray-400 tabular-nums">{(page - 1) * limit + i + 1}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                            {fmtDate(row.request?.created_at ?? row.created_at)}<br />
                            <span className="text-gray-400">{fmtTime(row.request?.created_at ?? row.created_at)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-primary-700 text-xs hover:underline inline-flex items-center gap-1">
                              {row.request?.request_code ?? '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">{row.item_name}</td>
                          <td className="px-4 py-3 text-gray-700 font-medium">{row.request?.outlet?.name ?? '-'}</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900">{row.qty}</td>
                          <td className="px-4 py-3 text-gray-500">{row.unit}</td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {row.purchase_type && PURCHASE_TYPE_LABEL[row.purchase_type] ? (
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PURCHASE_TYPE_LABEL[row.purchase_type].cls}`}>
                                {PURCHASE_TYPE_LABEL[row.purchase_type].label}
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-400">
                                -
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.status && STATUS_LABEL[row.status] ? (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABEL[row.status].cls}`}>
                                {STATUS_LABEL[row.status].label}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                            {row.delivered_at ? (
                              <><span className="font-medium">{fmtDate(row.delivered_at)}</span><br />
                              <span className="text-gray-400">{fmtTime(row.delivered_at)}</span></>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {targetUrl && (
                              <Link
                                href={targetUrl}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center justify-center p-1.5 rounded-lg text-primary-600 hover:text-primary-700 hover:bg-primary-50 transition-colors"
                                title="Buka detail permintaan"
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
            {total > limit && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Sebelumnya
                </button>
                <span className="text-sm text-gray-500">Hal {page} / {Math.ceil(total / limit)}</span>
                <button
                  disabled={page >= Math.ceil(total / limit)}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Selanjutnya →
                </button>
              </div>
            )}
          </>
        )}
      </AdminPage>
    </AdminLayout>
  );
}
