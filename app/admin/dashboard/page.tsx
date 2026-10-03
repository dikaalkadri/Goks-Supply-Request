'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { LoadingState } from '@/components/ui/States';
import type { DashboardStats } from '@/types';
import Link from 'next/link';

interface StatCard {
  label: string;
  value: number;
  color: string;
  bg: string;
  href?: string;
  highlight?: boolean;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((r) => r.json())
      .then((d) => setStats(d.data))
      .finally(() => setLoading(false));
  }, []);

  const cards: StatCard[] = stats ? [
    { label: 'Total Permintaan',  value: stats.total,               color: 'text-gray-900',    bg: 'bg-gray-50 border-gray-200',    href: '/admin/requests' },
    { label: 'Hari Ini',          value: stats.today,               color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',    href: '/admin/requests' },
    { label: 'Menunggu',          value: stats.pending,             color: 'text-yellow-700',  bg: 'bg-yellow-50 border-yellow-200', href: '/admin/requests?status=pending' },
    { label: 'Selesai',           value: stats.completed,           color: 'text-green-700',   bg: 'bg-green-50 border-green-200',  href: '/admin/requests?status=completed' },
    { label: 'Ditolak',           value: stats.rejected,            color: 'text-red-700',     bg: 'bg-red-50 border-red-200',      href: '/admin/requests?status=rejected' },
    { label: 'Belum Dibeli',      value: stats.not_purchased,       color: 'text-yellow-700',  bg: 'bg-yellow-50 border-yellow-200', href: '/admin/requests?purchase_status=not_purchased' },
    { label: 'Sudah Dibeli',      value: stats.purchased,           color: 'text-green-700',   bg: 'bg-green-50 border-green-200',  href: '/admin/requests?purchase_status=purchased' },
    {
      label: '⚠️ Sudah Dibeli, Belum Ada Nota',
      value: stats.purchased_no_receipt,
      color: 'text-orange-700',
      bg: 'bg-orange-50 border-orange-300',
      href: '/admin/requests?purchase_status=purchased&has_receipt=no',
      highlight: true,
    },
  ] : [];

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Ringkasan permintaan & pembelian barang.</p>
        </div>

        {loading ? (
          <LoadingState text="Memuat statistik..." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
            {cards.map((card) => {
              const content = (
                <div className={`rounded-2xl border p-5 transition-all ${card.bg} ${card.href ? 'hover:shadow-md cursor-pointer' : ''} ${card.highlight ? 'col-span-2 sm:col-span-3 lg:col-span-3' : ''}`}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{card.label}</p>
                  <p className={`text-4xl font-bold ${card.color}`}>{card.value}</p>
                  {card.highlight && card.value > 0 && (
                    <p className="text-xs text-orange-600 mt-1 font-medium">
                      Perlu perhatian — {card.value} permintaan sudah dibeli namun nota belum ada.
                    </p>
                  )}
                </div>
              );
              return card.href ? (
                <Link key={card.label} href={card.href} className={card.highlight ? 'col-span-2 sm:col-span-3 lg:col-span-3' : ''}>
                  {content}
                </Link>
              ) : (
                <div key={card.label}>{content}</div>
              );
            })}
          </div>
        )}

        {!loading && stats?.recap && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900">Outlet Teraktif</h2>
              <p className="text-xs text-gray-500 mb-3">{stats.recap.days} hari terakhir</p>
              {stats.recap.top_outlets.length === 0 ? (
                <p className="text-sm text-gray-400">Belum ada permintaan.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                      <th className="text-left py-2 font-semibold">Outlet</th>
                      <th className="text-right py-2 font-semibold">Permintaan</th>
                      <th className="text-right py-2 font-semibold">Barang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recap.top_outlets.map((o) => (
                      <tr key={o.outlet_id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2">
                          <Link href={`/admin/requests?outlet_id=${o.outlet_id}`} className="hover:text-primary-700">{o.name}</Link>
                        </td>
                        <td className="py-2 text-right font-semibold tabular-nums">{o.requests}</td>
                        <td className="py-2 text-right text-gray-600 tabular-nums">{o.items}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900">Barang Paling Sering Diminta</h2>
              <p className="text-xs text-gray-500 mb-3">{stats.recap.days} hari terakhir</p>
              {stats.recap.top_items.length === 0 ? (
                <p className="text-sm text-gray-400">Belum ada permintaan.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                      <th className="text-left py-2 font-semibold">Barang</th>
                      <th className="text-right py-2 font-semibold">Diminta</th>
                      <th className="text-right py-2 font-semibold">Total Qty</th>
                      <th className="text-right py-2 font-semibold">Ditolak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recap.top_items.map((it) => (
                      <tr key={`${it.name}|${it.unit}`} className="border-b border-gray-50 last:border-0">
                        <td className="py-2">{it.name}</td>
                        <td className="py-2 text-right font-semibold tabular-nums">{it.requests}×</td>
                        <td className="py-2 text-right text-gray-600 tabular-nums">{it.qty} {it.unit}</td>
                        <td className="py-2 text-right tabular-nums text-red-600">{it.rejected || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
