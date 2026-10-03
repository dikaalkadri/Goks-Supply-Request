'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Filter, ChevronRight, Package, SlidersHorizontal, X } from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import Button from '@/components/ui/Button';
import type { Request, Outlet } from '@/types';
import { formatDateShort, formatTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

const OUTLET_FILTER_KEY = 'requests_filter_outlet';

// localStorage can throw (private mode, blocked storage): never break the page
function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export default function RequestsPage() {
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
  const [showFilters, setShowFilters] = useState(false);
  // 'mine' = requests submitted from this browser (ids saved in request_tokens on submit)
  const [tab, setTab] = useState<'all' | 'mine'>('all');
  const [myIds, setMyIds] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);

  // Restore remembered outlet filter + this browser's request ids
  useEffect(() => {
    const savedOutlet = readStorage<string>(OUTLET_FILTER_KEY, '');
    const tokens = readStorage<Record<string, string>>('request_tokens', {});
    setFilterOutlet(savedOutlet);
    if (savedOutlet) setShowFilters(true);
    setMyIds(Object.keys(tokens).slice(-100));
    setStorageReady(true);
  }, []);

  const fetchData = useCallback(async () => {
    if (!storageReady) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab === 'mine') params.set('ids', myIds.join(','));
      if (search) params.set('search', search);
      if (filterOutlet) params.set('outlet_id', filterOutlet);
      if (filterStatus) params.set('status', filterStatus);
      if (filterPurchase) params.set('purchase_status', filterPurchase);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`/api/requests?${params}`);
      const data = await res.json();
      setRequests(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [search, filterOutlet, filterStatus, filterPurchase, page, tab, myIds, storageReady]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    fetch('/api/outlets').then((r) => r.json()).then((d) => setOutlets(d.data ?? []));
  }, []);

  const hasFilters = filterOutlet || filterStatus || filterPurchase;

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Daftar Permintaan</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} permintaan ditemukan</p>
          </div>
          <Link href="/">
            <Button size="sm" variant="primary">+ Buat Permintaan</Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-3 w-fit">
          {([['all', 'Semua'], ['mine', 'Permintaan Saya']] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setTab(key); setPage(1); }}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                tab === key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search + Filter Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-4 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
              <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Cari kode atau nama pengaju..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="flex-1 bg-transparent text-sm focus:outline-none text-gray-700 placeholder:text-gray-400"
              />
              {search && (
                <button onClick={() => setSearch('')}>
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                hasFilters ? 'bg-primary-100 text-primary-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filter</span>
              {hasFilters && <span className="bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded-full">!</span>}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-gray-100">
              <select
                value={filterOutlet}
                onChange={(e) => { setFilterOutlet(e.target.value); writeStorage(OUTLET_FILTER_KEY, e.target.value); setPage(1); }}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">Semua Outlet</option>
                {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="completed">Selesai</option>
                <option value="rejected">Ditolak</option>
              </select>
              <select
                value={filterPurchase}
                onChange={(e) => { setFilterPurchase(e.target.value); setPage(1); }}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">Semua Pembelian</option>
                <option value="not_purchased">Belum Dibeli</option>
                <option value="purchased">Sudah Dibeli</option>
              </select>
            </div>
          )}
        </div>

        {/* List */}
        {loading ? (
          <LoadingState text="Memuat permintaan..." />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<Package className="h-12 w-12" />}
            title={tab === 'mine' ? 'Belum ada permintaan dari perangkat ini.' : 'Belum ada permintaan barang.'}
            description={tab === 'mine'
              ? 'Permintaan yang Anda kirim dari browser ini akan muncul di sini.'
              : 'Buat permintaan baru untuk memulai.'}
            action={<Link href="/"><Button size="sm">Buat Permintaan</Button></Link>}
          />
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <Link key={req.id} href={`/requests/${req.id}`}>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-primary-200 hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-primary-700 text-sm">{req.request_code}</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-xs text-gray-500">
                          {formatDateShort(req.created_at)} {formatTime(req.created_at)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">
                        {req.outlet?.name ?? '-'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        oleh {req.requester_name} ·{' '}
                        {req.request_items?.length ?? 0} barang
                      </p>
                    </div>
                    <StatusBadge status={req.status} />
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0 self-center" />
                  </div>
                </div>
              </Link>
            ))}

            {/* Pagination */}
            {total > limit && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Sebelumnya
                </Button>
                <span className="text-sm text-gray-500">
                  Hal {page} / {Math.ceil(total / limit)}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= Math.ceil(total / limit)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Selanjutnya →
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
