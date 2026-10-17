
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminPage from '@/components/admin/AdminPage';
import Button from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { DashboardStats, Request } from '@/types';
import Link from 'next/link';
import DateRangePicker, { formatDateRange } from '@/components/ui/DateRangePicker';
import { formatDateShort, formatTime } from '@/lib/utils/format';

const IconClipboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);
const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconXCircle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconCart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <circle cx="9" cy="21" r="1" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="20" cy="21" r="1" strokeLinecap="round" strokeLinejoin="round"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6" />
  </svg>
);
const IconBag = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);
const IconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);
const IconFilter = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
  </svg>
);
const IconRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);
const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const IconExternalLink = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);
const IconLoader = () => (
  <svg className="w-5 h-5 animate-spin text-violet-500" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
  </svg>
);

type CardKey = 'total' | 'today' | 'pending' | 'completed' | 'rejected' | 'not_purchased' | 'purchased' | 'purchased_no_receipt';
interface ActivePanel { key: CardKey; label: string; accentColor: string; }
interface CardDef {
  key: CardKey; label: string; icon: React.ReactNode;
  valueColor: string; iconStyle: { background: string; color: string };
  cardGradient: string; cardBorder: string; activeBorder: string;
  getParams: (dateFrom: string, dateTo: string, today: string) => Record<string, string>;
}

const CARD_DEFS: CardDef[] = [
  { key: 'total', label: 'Total', icon: <IconClipboard />, valueColor: 'text-slate-800',
    iconStyle: { background: '#e0e7ff', color: '#4338ca' }, cardGradient: 'linear-gradient(135deg,#f8faff,#eef2ff)',
    cardBorder: '#c7d2fe', activeBorder: '#6366f1',
    getParams: (f, t) => { const p: Record<string, string> = {}; if (f) p.date_from = f; if (t) p.date_to = t; return p; } },
  { key: 'today', label: 'Hari Ini', icon: <IconCalendar />, valueColor: 'text-sky-700',
    iconStyle: { background: '#e0f2fe', color: '#0369a1' }, cardGradient: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)',
    cardBorder: '#bae6fd', activeBorder: '#0284c7',
    getParams: (_f, _t, today) => ({ date_from: today, date_to: today }) },
  { key: 'pending', label: 'Menunggu', icon: <IconClock />, valueColor: 'text-amber-700',
    iconStyle: { background: '#fef3c7', color: '#92400e' }, cardGradient: 'linear-gradient(135deg,#fffdf0,#fef9c3)',
    cardBorder: '#fde68a', activeBorder: '#d97706',
    getParams: (f, t) => { const p: Record<string, string> = { status: 'pending' }; if (f) p.date_from = f; if (t) p.date_to = t; return p; } },
  { key: 'completed', label: 'Selesai', icon: <IconCheck />, valueColor: 'text-emerald-700',
    iconStyle: { background: '#d1fae5', color: '#065f46' }, cardGradient: 'linear-gradient(135deg,#f0fdf9,#d1fae5)',
    cardBorder: '#6ee7b7', activeBorder: '#059669',
    getParams: (f, t) => { const p: Record<string, string> = { status: 'completed' }; if (f) p.date_from = f; if (t) p.date_to = t; return p; } },
  { key: 'rejected', label: 'Ditolak', icon: <IconXCircle />, valueColor: 'text-rose-700',
    iconStyle: { background: '#ffe4e6', color: '#9f1239' }, cardGradient: 'linear-gradient(135deg,#fff1f2,#ffe4e6)',
    cardBorder: '#fda4af', activeBorder: '#e11d48',
    getParams: (f, t) => { const p: Record<string, string> = { status: 'rejected' }; if (f) p.date_from = f; if (t) p.date_to = t; return p; } },
  { key: 'not_purchased', label: 'Belum Dibeli', icon: <IconCart />, valueColor: 'text-orange-700',
    iconStyle: { background: '#ffedd5', color: '#9a3412' }, cardGradient: 'linear-gradient(135deg,#fff8f1,#ffedd5)',
    cardBorder: '#fdba74', activeBorder: '#ea580c',
    getParams: (f, t) => { const p: Record<string, string> = { purchase_status: 'not_purchased' }; if (f) p.date_from = f; if (t) p.date_to = t; return p; } },
  { key: 'purchased', label: 'Sudah Dibeli', icon: <IconBag />, valueColor: 'text-teal-700',
    iconStyle: { background: '#ccfbf1', color: '#0f766e' }, cardGradient: 'linear-gradient(135deg,#f0fefa,#ccfbf1)',
    cardBorder: '#5eead4', activeBorder: '#0d9488',
    getParams: (f, t) => { const p: Record<string, string> = { purchase_status: 'purchased' }; if (f) p.date_from = f; if (t) p.date_to = t; return p; } },
];

function buildHref(base: string, params: Record<string, string>, dateFrom: string, dateTo: string) {
  const p = new URLSearchParams(params);
  if (dateFrom) p.set('date_from', dateFrom);
  if (dateTo)   p.set('date_to', dateTo);
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

function PurchaseTypeBadge({ type }: { type?: string | null }) {
  if (!type) return null;
  if (type === 'warehouse') return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">Gudang</span>;
  if (type === 'petty_cash') return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">Kas Kecil</span>;
  return null;
}

interface RequestPanelProps {
  panel: ActivePanel;
  params: Record<string, string>;
  onClose: () => void;
  panelRef: React.RefObject<HTMLDivElement | null>;
}

function RequestPanel({ panel, params, onClose, panelRef }: RequestPanelProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchRequests = useCallback(async (pg: number) => {
    setLoading(true);
    try {
      const p = new URLSearchParams(params);
      p.set('page', String(pg));
      p.set('limit', String(limit));
      const res = await fetch(`/api/admin/requests?${p}`);
      const data = await res.json();
      setRequests(data.data ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { setPage(1); fetchRequests(1); }, [fetchRequests]);

  const handlePage = (pg: number) => {
    setPage(pg); fetchRequests(pg);
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const totalPages = Math.ceil(total / limit);
  const fullHref = buildHref('/admin/requests', params, '', '');

  return (
    <div ref={panelRef} className="mt-2.5 rounded-2xl border overflow-hidden shadow-lg"
      style={{ borderColor: panel.accentColor, background: '#fff' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ background: panel.accentColor + '18', borderColor: panel.accentColor + '30' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: panel.accentColor }} />
          <span className="font-semibold text-gray-800 text-sm">{panel.label}</span>
          {!loading && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: panel.accentColor + '20', color: panel.accentColor }}>
              {total.toLocaleString()} permintaan
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={fullHref}
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ background: panel.accentColor + '18', color: panel.accentColor }}>
            <IconExternalLink />
            Lihat semua
          </Link>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500" aria-label="Tutup panel">
            <IconClose />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10">
          <IconLoader /><span className="text-sm text-gray-500">Memuat data...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-10"><p className="text-sm text-gray-400">Tidak ada permintaan.</p></div>
      ) : (
        <>
          <div className="lg:hidden divide-y divide-gray-50">
            {requests.map((req, i) => {
              const itemNames = (req.request_items ?? []).map((it) => it.item_name).join(', ');
              const pts = [...new Set((req.request_items ?? []).map((it) => it.purchase_type).filter(Boolean))];
              return (
                <div key={req.id} className="p-4 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <Link href={`/admin/requests/${req.id}`} className="font-bold text-sm hover:underline" style={{ color: panel.accentColor }}>
                      <span className="text-gray-400 font-medium tabular-nums mr-1.5">{(page - 1) * limit + i + 1}.</span>
                      {req.request_code}
                    </Link>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-sm font-medium text-gray-800 mb-0.5 line-clamp-2">{itemNames || '-'}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-gray-500">{req.outlet?.name ?? '-'}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-400">{formatDateShort(req.created_at)}</span>
                    {pts.map((pt) => <PurchaseTypeBadge key={String(pt)} type={pt} />)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-right pl-4 pr-2 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">No</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kode</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tanggal</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Outlet</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nama Barang</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kategori Beli</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req, i) => {
                  const itemNames = (req.request_items ?? []).map((it) => it.item_name).join(', ');
                  const pts = [...new Set((req.request_items ?? []).map((it) => it.purchase_type).filter(Boolean))];
                  return (
                    <tr key={req.id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                      <td className="pl-4 pr-2 py-2.5 text-right text-gray-400 tabular-nums">{(page - 1) * limit + i + 1}</td>
                      <td className="px-4 py-2.5"><span className="font-bold text-sm" style={{ color: panel.accentColor }}>{req.request_code}</span></td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">{formatDateShort(req.created_at)}<br />{formatTime(req.created_at)}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">{req.outlet?.name ?? '-'}</td>
                      <td className="px-4 py-2.5 text-gray-700 max-w-xs">
                        <span className="line-clamp-2 text-xs leading-relaxed block">{itemNames || '-'}</span>
                        <span className="text-[10px] text-gray-400">{req.request_items?.length ?? 0} barang</span>
                      </td>
                      <td className="px-4 py-2.5 text-center"><StatusBadge status={req.status} /></td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {pts.length > 0 ? pts.map((pt) => <PurchaseTypeBadge key={String(pt)} type={pt} />) : <span className="text-gray-300 text-xs">-</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link href={`/admin/requests/${req.id}`}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium hover:opacity-80 transition-opacity whitespace-nowrap"
                          style={{ background: panel.accentColor + '15', color: panel.accentColor }}>
                          Detail <IconExternalLink />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-gray-50">
              <button disabled={page === 1} onClick={() => handlePage(page - 1)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                &larr; Sebelumnya
              </button>
              <span className="text-xs text-gray-500">Hal {page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => handlePage(page + 1)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Selanjutnya &rarr;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [activePanel, setActivePanel] = useState<ActivePanel | null>(null);
  const [panelParams, setPanelParams] = useState<Record<string, string>>({});
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchStats = useCallback((from: string, to: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set('date_from', from);
    if (to)   params.set('date_to', to);
    const qs = params.toString();
    fetch(`/api/admin/dashboard${qs ? '?' + qs : ''}`)
      .then((r) => r.json())
      .then((d) => setStats(d.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchStats('', ''); }, [fetchStats]);

  const applyRange = (from: string, to: string) => { setDateFrom(from); setDateTo(to); fetchStats(from, to); setActivePanel(null); };
  const handleApply = () => applyRange(fromInput, toInput);
  const handleReset = () => { setFromInput(''); setToInput(''); setDateFrom(''); setDateTo(''); fetchStats('', ''); setActivePanel(null); };

  const isFiltered = !!dateFrom || !!dateTo;
  const values: number[] = stats
    ? [stats.total, stats.today, stats.pending, stats.completed, stats.rejected, stats.not_purchased, stats.purchased]
    : Array(7).fill(0);

  const handleCardClick = (def: CardDef) => {
    const params = def.getParams(dateFrom, dateTo, today);
    if (activePanel?.key === def.key) { setActivePanel(null); return; }
    setActivePanel({ key: def.key, label: def.label, accentColor: def.activeBorder });
    setPanelParams(params);
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleAlertClick = () => {
    if (activePanel?.key === 'purchased_no_receipt') { setActivePanel(null); return; }
    const params: Record<string, string> = { purchase_status: 'purchased', has_receipt: 'no' };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo)   params.date_to = dateTo;
    setActivePanel({ key: 'purchased_no_receipt', label: 'Sudah Dibeli, Belum Ada Nota', accentColor: '#f97316' });
    setPanelParams(params);
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  return (
    <AdminLayout>
      <AdminPage
        title="Dashboard"
        subtitle="Ringkasan permintaan & pembelian barang."
        actions={
          <>
            <div className="w-64">
              <DateRangePicker
                dateFrom={fromInput}
                dateTo={toInput}
                onChange={(f, t) => {
                  setFromInput(f);
                  setToInput(t);
                  // A complete range (e.g. a picked month) or a cleared filter applies right away
                  if ((f && t) || (!f && !t)) applyRange(f, t);
                }}
              />
            </div>
            {/* Only needed when just a start date is picked; complete ranges apply automatically */}
            {fromInput && !toInput && (
              <Button size="sm" onClick={handleApply}>Terapkan</Button>
            )}
            {isFiltered && (
              <Button size="sm" variant="secondary" onClick={handleReset}>
                <IconRefresh /> Reset
              </Button>
            )}
          </>
        }
      >

        {isFiltered && (
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
              <IconFilter />
              {formatDateRange(dateFrom, dateTo)}
            </span>
            <span className="text-xs text-gray-400">Data difilter berdasarkan tanggal permintaan.</span>
          </div>
        )}

        {loading ? (
          <LoadingState text="Memuat statistik..." />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-2.5">
              {CARD_DEFS.map((def, i) => {
                const isActive = activePanel?.key === def.key;
                return (
                  <button key={def.key} onClick={() => handleCardClick(def)}
                    className="block text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 rounded-2xl"
                    aria-pressed={isActive}>
                    <div style={{
                      background: def.cardGradient,
                      borderColor: isActive ? def.activeBorder : def.cardBorder,
                      boxShadow: isActive ? `0 0 0 2px ${def.activeBorder}` : undefined,
                    }} className={`group rounded-2xl border p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer h-full${isActive ? ' shadow-md -translate-y-0.5' : ''}`}>
                      <div className="flex items-center justify-between mb-2.5">
                        <div style={def.iconStyle} className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shrink-0">
                          {def.icon}
                        </div>
                        <span style={{ color: isActive ? def.activeBorder : '#d1d5db' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                            className={`w-4 h-4 transition-transform duration-200${isActive ? ' rotate-90' : ''}`}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                      <p className={`text-2xl font-bold tabular-nums leading-none mb-1 ${def.valueColor}`}>{values[i].toLocaleString()}</p>
                      <p className="text-[11px] font-medium text-gray-500 leading-tight">{def.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {activePanel && activePanel.key !== 'purchased_no_receipt' && (
              <RequestPanel key={activePanel.key} panel={activePanel} params={panelParams}
                onClose={() => setActivePanel(null)} panelRef={panelRef} />
            )}

            {stats && (
              <div className="mt-2.5">
                <button onClick={handleAlertClick}
                  className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1 rounded-2xl"
                  aria-pressed={activePanel?.key === 'purchased_no_receipt'}>
                  <div style={{
                    background: stats.purchased_no_receipt > 0 ? 'linear-gradient(135deg,#fff7ed,#ffedd5)' : 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
                    borderColor: activePanel?.key === 'purchased_no_receipt'
                      ? (stats.purchased_no_receipt > 0 ? '#f97316' : '#22c55e')
                      : (stats.purchased_no_receipt > 0 ? '#f97316' : '#86efac'),
                    boxShadow: activePanel?.key === 'purchased_no_receipt'
                      ? `0 0 0 2px ${stats.purchased_no_receipt > 0 ? '#f97316' : '#22c55e'}` : undefined,
                  }} className={`group rounded-2xl border p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer${activePanel?.key === 'purchased_no_receipt' ? ' shadow-md -translate-y-0.5' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div style={{ background: stats.purchased_no_receipt > 0 ? '#fed7aa' : '#bbf7d0', color: stats.purchased_no_receipt > 0 ? '#c2410c' : '#15803d' }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110">
                        {stats.purchased_no_receipt > 0 ? <IconAlert /> : <IconCheck />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className={`text-2xl font-bold tabular-nums ${stats.purchased_no_receipt > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>
                            {stats.purchased_no_receipt.toLocaleString()}
                          </span>
                          <span className={`text-sm font-semibold ${stats.purchased_no_receipt > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>
                            Sudah Dibeli, Belum Ada Nota
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${stats.purchased_no_receipt > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>
                          {stats.purchased_no_receipt > 0
                            ? `${stats.purchased_no_receipt} permintaan perlu dilengkapi nota — klik untuk lihat daftar`
                            : 'Semua permintaan sudah memiliki nota ✓'}
                        </p>
                      </div>
                      <span className={`shrink-0 transition-all duration-200 ${stats.purchased_no_receipt > 0 ? 'text-orange-400 group-hover:text-orange-600' : 'text-emerald-400 group-hover:text-emerald-600'}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                          className={`w-4 h-4 transition-transform duration-200${activePanel?.key === 'purchased_no_receipt' ? ' rotate-90' : ''}`}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </button>
                {activePanel?.key === 'purchased_no_receipt' && (
                  <RequestPanel key="purchased_no_receipt" panel={activePanel} params={panelParams}
                    onClose={() => setActivePanel(null)} panelRef={panelRef} />
                )}
              </div>
            )}

            {stats?.recap && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50">
                    <h2 className="font-semibold text-gray-900 text-sm">Outlet Teraktif</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {isFiltered ? formatDateRange(dateFrom, dateTo) : `${stats.recap.days} hari terakhir`}
                    </p>
                  </div>
                  <div className="px-5 pb-4">
                    {stats.recap.top_outlets.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">Belum ada permintaan.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead><tr className="text-xs text-gray-500 uppercase tracking-wide">
                          <th className="text-left py-3 font-semibold">Outlet</th>
                          <th className="text-right py-3 font-semibold">Req</th>
                          <th className="text-right py-3 font-semibold">Barang</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-50">
                          {stats.recap.top_outlets.map((o, i) => (
                            <tr key={o.outlet_id} className="hover:bg-violet-50/40 transition-colors">
                              <td className="py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                                  <Link href={buildHref('/admin/requests', { outlet_id: o.outlet_id }, dateFrom, dateTo)} className="hover:text-violet-700 font-medium truncate transition-colors">{o.name}</Link>
                                </div>
                              </td>
                              <td className="py-2.5 text-right font-semibold tabular-nums text-gray-800">{o.requests}</td>
                              <td className="py-2.5 text-right tabular-nums text-gray-500">{o.items}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50">
                    <h2 className="font-semibold text-gray-900 text-sm">Barang Paling Sering Diminta</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {isFiltered ? formatDateRange(dateFrom, dateTo) : `${stats.recap.days} hari terakhir`}
                    </p>
                  </div>
                  <div className="px-5 pb-4">
                    {stats.recap.top_items.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">Belum ada permintaan.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead><tr className="text-xs text-gray-500 uppercase tracking-wide">
                          <th className="text-left py-3 font-semibold">Barang</th>
                          <th className="text-right py-3 font-semibold">Req</th>
                          <th className="text-right py-3 font-semibold">Qty</th>
                          <th className="text-right py-3 font-semibold">Tolak</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-50">
                          {stats.recap.top_items.map((it, i) => (
                            <tr key={`${it.name}|${it.unit}`} className="hover:bg-blue-50/40 transition-colors">
                              <td className="py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                                  <span className="font-medium truncate">{it.name}</span>
                                </div>
                              </td>
                              <td className="py-2.5 text-right font-semibold tabular-nums text-gray-800">{it.requests}&times;</td>
                              <td className="py-2.5 text-right tabular-nums text-gray-500">{it.qty} {it.unit}</td>
                              <td className="py-2.5 text-right tabular-nums">
                                {it.rejected ? <span className="text-rose-500 font-medium">{it.rejected}</span> : <span className="text-gray-300">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </AdminPage>
    </AdminLayout>
  );
}
