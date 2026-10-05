'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { LoadingState } from '@/components/ui/States';
import type { DashboardStats } from '@/types';
import Link from 'next/link';

/* ─── Icons ──────────────────────────────────────────────────── */
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
const IconX = () => (
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
const IconChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
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

/* ─── Card definitions ───────────────────────────────────────── */
interface CardDef {
  label: string;
  icon: React.ReactNode;
  /** tailwind text color for the value */
  valueColor: string;
  /** solid background pill for the icon */
  iconStyle: { background: string; color: string };
  /** card background gradient */
  cardGradient: string;
  /** card border hex */
  cardBorder: string;
  href: (dateFrom: string, dateTo: string) => string;
}

const CARD_DEFS: CardDef[] = [
  {
    label: 'Total',
    icon: <IconClipboard />,
    valueColor: 'text-slate-800',
    iconStyle: { background: '#e0e7ff', color: '#4338ca' },
    cardGradient: 'linear-gradient(135deg,#f8faff,#eef2ff)',
    cardBorder: '#c7d2fe',
    href: (f, t) => buildHref('/admin/requests', {}, f, t),
  },
  {
    label: 'Hari Ini',
    icon: <IconCalendar />,
    valueColor: 'text-sky-700',
    iconStyle: { background: '#e0f2fe', color: '#0369a1' },
    cardGradient: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)',
    cardBorder: '#bae6fd',
    href: () => `/admin/requests`,
  },
  {
    label: 'Menunggu',
    icon: <IconClock />,
    valueColor: 'text-amber-700',
    iconStyle: { background: '#fef3c7', color: '#92400e' },
    cardGradient: 'linear-gradient(135deg,#fffdf0,#fef9c3)',
    cardBorder: '#fde68a',
    href: (f, t) => buildHref('/admin/requests', { status: 'pending' }, f, t),
  },
  {
    label: 'Selesai',
    icon: <IconCheck />,
    valueColor: 'text-emerald-700',
    iconStyle: { background: '#d1fae5', color: '#065f46' },
    cardGradient: 'linear-gradient(135deg,#f0fdf9,#d1fae5)',
    cardBorder: '#6ee7b7',
    href: (f, t) => buildHref('/admin/requests', { status: 'completed' }, f, t),
  },
  {
    label: 'Ditolak',
    icon: <IconX />,
    valueColor: 'text-rose-700',
    iconStyle: { background: '#ffe4e6', color: '#9f1239' },
    cardGradient: 'linear-gradient(135deg,#fff1f2,#ffe4e6)',
    cardBorder: '#fda4af',
    href: (f, t) => buildHref('/admin/requests', { status: 'rejected' }, f, t),
  },
  {
    label: 'Belum Dibeli',
    icon: <IconCart />,
    valueColor: 'text-orange-700',
    iconStyle: { background: '#ffedd5', color: '#9a3412' },
    cardGradient: 'linear-gradient(135deg,#fff8f1,#ffedd5)',
    cardBorder: '#fdba74',
    href: (f, t) => buildHref('/admin/requests', { purchase_status: 'not_purchased' }, f, t),
  },
  {
    label: 'Sudah Dibeli',
    icon: <IconBag />,
    valueColor: 'text-teal-700',
    iconStyle: { background: '#ccfbf1', color: '#0f766e' },
    cardGradient: 'linear-gradient(135deg,#f0fefa,#ccfbf1)',
    cardBorder: '#5eead4',
    href: (f, t) => buildHref('/admin/requests', { purchase_status: 'purchased' }, f, t),
  },
];

function buildHref(base: string, params: Record<string, string>, dateFrom: string, dateTo: string) {
  const p = new URLSearchParams(params);
  if (dateFrom) p.set('date_from', dateFrom);
  if (dateTo)   p.set('date_to', dateTo);
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function AdminDashboardPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [stats,    setStats]    = useState<DashboardStats | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  // pending inputs (apply only on submit)
  const [fromInput, setFromInput] = useState('');
  const [toInput,   setToInput]   = useState('');

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

  const handleApply = () => {
    setDateFrom(fromInput);
    setDateTo(toInput);
    fetchStats(fromInput, toInput);
  };

  const handleReset = () => {
    setFromInput(''); setToInput('');
    setDateFrom('');  setDateTo('');
    fetchStats('', '');
  };

  const isFiltered = !!dateFrom || !!dateTo;

  /* stat values in order matching CARD_DEFS */
  const values: number[] = stats
    ? [
        stats.total,
        stats.today,
        stats.pending,
        stats.completed,
        stats.rejected,
        stats.not_purchased,
        stats.purchased,
      ]
    : Array(7).fill(0);

  return (
    <AdminLayout>
      <div className="p-6">
        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Ringkasan permintaan &amp; pembelian barang.</p>
          </div>

          {/* Date filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
              <span className="text-gray-400"><IconFilter /></span>
              <span className="text-xs text-gray-500 font-medium hidden sm:inline">Filter:</span>
              <input
                id="date-from"
                type="date"
                value={fromInput}
                max={toInput || today}
                onChange={(e) => setFromInput(e.target.value)}
                className="text-xs text-gray-700 bg-transparent outline-none w-32 cursor-pointer"
              />
              <span className="text-gray-300 text-xs">→</span>
              <input
                id="date-to"
                type="date"
                value={toInput}
                min={fromInput || undefined}
                max={today}
                onChange={(e) => setToInput(e.target.value)}
                className="text-xs text-gray-700 bg-transparent outline-none w-32 cursor-pointer"
              />
            </div>
            <button
              onClick={handleApply}
              className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
            >
              Terapkan
            </button>
            {isFiltered && (
              <button
                onClick={handleReset}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1"
              >
                <IconRefresh />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Active filter badge */}
        {isFiltered && (
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
              <IconFilter />
              {dateFrom && dateTo
                ? `${dateFrom} — ${dateTo}`
                : dateFrom
                ? `Dari ${dateFrom}`
                : `Sampai ${dateTo}`}
            </span>
            <span className="text-xs text-gray-400">Data difilter berdasarkan tanggal permintaan.</span>
          </div>
        )}

        {loading ? (
          <LoadingState text="Memuat statistik..." />
        ) : (
          <>
            {/* ── 7 stat cards — 1 baris ───────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-2.5">
              {CARD_DEFS.map((def, i) => {
                const href = def.href(dateFrom, dateTo);
                const inner = (
                  <div
                    style={{
                      background: def.cardGradient,
                      borderColor: def.cardBorder,
                    }}
                    className="group rounded-2xl border p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer h-full"
                  >
                    {/* icon + chevron row */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div
                        style={def.iconStyle}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shrink-0"
                      >
                        {def.icon}
                      </div>
                      <span className="text-gray-300 group-hover:text-gray-400 transition-colors">
                        <IconChevron />
                      </span>
                    </div>
                    {/* value */}
                    <p className={`text-2xl font-bold tabular-nums leading-none mb-1 ${def.valueColor}`}>
                      {values[i].toLocaleString()}
                    </p>
                    {/* label */}
                    <p className="text-[11px] font-medium text-gray-500 leading-tight">{def.label}</p>
                  </div>
                );
                return (
                  <Link key={def.label} href={href} className="block">
                    {inner}
                  </Link>
                );
              })}
            </div>

            {/* ── Highlight / alert card (full width) ─────────── */}
            {stats && (
              <Link
                href={buildHref(
                  '/admin/requests',
                  { purchase_status: 'purchased', has_receipt: 'no' },
                  dateFrom, dateTo
                )}
                className="block"
              >
                <div
                  style={{
                    background: stats.purchased_no_receipt > 0
                      ? 'linear-gradient(135deg,#fff7ed,#ffedd5)'
                      : 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
                    borderColor: stats.purchased_no_receipt > 0 ? '#f97316' : '#86efac',
                  }}
                  className="group rounded-2xl border p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        background: stats.purchased_no_receipt > 0 ? '#fed7aa' : '#bbf7d0',
                        color:      stats.purchased_no_receipt > 0 ? '#c2410c' : '#15803d',
                      }}
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                    >
                      {stats.purchased_no_receipt > 0 ? <IconAlert /> : <IconCheck />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span
                          className={`text-2xl font-bold tabular-nums ${
                            stats.purchased_no_receipt > 0 ? 'text-orange-700' : 'text-emerald-700'
                          }`}
                        >
                          {stats.purchased_no_receipt.toLocaleString()}
                        </span>
                        <span
                          className={`text-sm font-semibold ${
                            stats.purchased_no_receipt > 0 ? 'text-orange-700' : 'text-emerald-700'
                          }`}
                        >
                          Sudah Dibeli, Belum Ada Nota
                        </span>
                      </div>
                      <p
                        className={`text-xs mt-0.5 ${
                          stats.purchased_no_receipt > 0
                            ? 'text-orange-500'
                            : 'text-emerald-500'
                        }`}
                      >
                        {stats.purchased_no_receipt > 0
                          ? `${stats.purchased_no_receipt} permintaan perlu dilengkapi nota`
                          : 'Semua permintaan sudah memiliki nota ✓'}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 transition-colors ${
                        stats.purchased_no_receipt > 0
                          ? 'text-orange-400 group-hover:text-orange-600'
                          : 'text-emerald-400 group-hover:text-emerald-600'
                      }`}
                    >
                      <IconChevron />
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* ── Recap Tables ─────────────────────────────────── */}
            {stats?.recap && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                {/* Outlet Teraktif */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50 flex items-start justify-between">
                    <div>
                      <h2 className="font-semibold text-gray-900 text-sm">Outlet Teraktif</h2>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {isFiltered
                          ? (dateFrom && dateTo ? `${dateFrom} – ${dateTo}` : dateFrom ? `Dari ${dateFrom}` : `Sampai ${dateTo}`)
                          : `${stats.recap.days} hari terakhir`}
                      </p>
                    </div>
                  </div>
                  <div className="px-5 pb-4">
                    {stats.recap.top_outlets.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">Belum ada permintaan.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-400 uppercase tracking-wide">
                            <th className="text-left py-3 font-semibold">Outlet</th>
                            <th className="text-right py-3 font-semibold">Req</th>
                            <th className="text-right py-3 font-semibold">Barang</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {stats.recap.top_outlets.map((o, i) => (
                            <tr key={o.outlet_id} className="hover:bg-violet-50/40 transition-colors">
                              <td className="py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {i + 1}
                                  </span>
                                  <Link
                                    href={buildHref(`/admin/requests`, { outlet_id: o.outlet_id }, dateFrom, dateTo)}
                                    className="hover:text-violet-700 font-medium truncate transition-colors"
                                  >
                                    {o.name}
                                  </Link>
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

                {/* Barang Paling Sering Diminta */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50">
                    <h2 className="font-semibold text-gray-900 text-sm">Barang Paling Sering Diminta</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {isFiltered
                        ? (dateFrom && dateTo ? `${dateFrom} – ${dateTo}` : dateFrom ? `Dari ${dateFrom}` : `Sampai ${dateTo}`)
                        : `${stats.recap.days} hari terakhir`}
                    </p>
                  </div>
                  <div className="px-5 pb-4">
                    {stats.recap.top_items.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">Belum ada permintaan.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-400 uppercase tracking-wide">
                            <th className="text-left py-3 font-semibold">Barang</th>
                            <th className="text-right py-3 font-semibold">Req</th>
                            <th className="text-right py-3 font-semibold">Qty</th>
                            <th className="text-right py-3 font-semibold">Tolak</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {stats.recap.top_items.map((it, i) => (
                            <tr key={`${it.name}|${it.unit}`} className="hover:bg-blue-50/40 transition-colors">
                              <td className="py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {i + 1}
                                  </span>
                                  <span className="font-medium truncate">{it.name}</span>
                                </div>
                              </td>
                              <td className="py-2.5 text-right font-semibold tabular-nums text-gray-800">{it.requests}×</td>
                              <td className="py-2.5 text-right tabular-nums text-gray-500">{it.qty} {it.unit}</td>
                              <td className="py-2.5 text-right tabular-nums">
                                {it.rejected ? (
                                  <span className="text-rose-500 font-medium">{it.rejected}</span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
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
      </div>
    </AdminLayout>
  );
}
