'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Package, AlertCircle, Receipt,
  Camera, ExternalLink
} from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingState } from '@/components/ui/States';
import Button from '@/components/ui/Button';
import type { Request } from '@/types';
import { formatDateTime } from '@/lib/utils/format';

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

  async function fetchRequest() {
    setLoading(true);
    try {
      const res = await fetch(`/api/requests/${id}`);
      if (!res.ok) { setRequest(null); return; }
      const data = await res.json();
      setRequest(data.data);
    } catch {
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRequest(); }, [id]);

  const getPhotoUrl = (path: string, bucket: string) => {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PublicNav />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <LoadingState text="Memuat permintaan..." />
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PublicNav />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-gray-900">Permintaan tidak ditemukan.</h1>
          <Link href="/requests" className="mt-4 inline-block">
            <Button variant="secondary" size="sm">← Kembali ke Daftar</Button>
          </Link>
        </div>
      </div>
    );
  }

  const hasReceiptPhotos = (request.purchase_receipts?.length ?? 0) > 0;
  const hasConditionPhotos = (request.request_photos?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Back */}
        <Link href="/requests" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-primary-700">{request.request_code}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {formatDateTime(request.created_at)}
              </p>
            </div>
            <StatusBadge status={request.status} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide font-medium">Outlet</p>
              <p className="font-semibold text-gray-900 mt-0.5">{request.outlet?.name ?? '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide font-medium">Pengaju</p>
              <p className="font-semibold text-gray-900 mt-0.5">{request.requester_name}</p>
            </div>
          </div>
        </div>

        {/* Daftar Barang */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-600" />
            Daftar Barang
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Barang</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Qty</th>
                  <th className="text-left py-2 pl-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Satuan</th>
                  <th className="text-right py-2 pl-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {request.request_items?.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        {item.photo_path && (
                          <a
                            href={getPhotoUrl(item.photo_path, 'request-condition-photos')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 hover:opacity-80 transition-opacity"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getPhotoUrl(item.photo_path, 'request-condition-photos')}
                              alt={`Foto ${item.item_name}`}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        )}
                        <div>
                          <span className="font-medium text-gray-900">{item.item_name}</span>
                          {item.is_manual && (
                            <span className="ml-1.5 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
                              Manual
                            </span>
                          )}
                          {item.admin_note && (
                            <p className={`text-xs mt-0.5 ${item.status === 'rejected' ? 'text-red-600' : 'text-gray-500'}`}>
                              Catatan admin: {item.admin_note}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-semibold text-gray-900">{item.qty}</td>
                    <td className="py-2.5 pl-3 text-gray-500">{item.unit}</td>
                    <td className="py-2.5 pl-3 text-right whitespace-nowrap">
                      <StatusBadge status={item.status ?? 'pending'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Catatan */}
        {request.note && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <h2 className="font-semibold text-gray-900 mb-2">Catatan</h2>
            <p className="text-sm text-gray-600">{request.note}</p>
          </div>
        )}

        {/* Foto Kondisi — legacy, only shown for older requests that have them */}
        {hasConditionPhotos && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Camera className="h-4 w-4 text-gray-600" />
            Foto Kondisi Barang
          </h2>
            <div className="flex gap-2 flex-wrap">
              {request.request_photos?.map((photo) => (
                <a
                  key={photo.id}
                  href={getPhotoUrl(photo.storage_path, 'request-condition-photos')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 block hover:opacity-80 transition-opacity"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getPhotoUrl(photo.storage_path, 'request-condition-photos')}
                    alt="Foto kondisi"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/30 transition-opacity">
                    <ExternalLink className="h-4 w-4 text-white" />
                  </div>
                </a>
              ))}
            </div>
        </div>
        )}

        {/* Nota Pembelian — read-only */}
        {hasReceiptPhotos && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-gray-600" />
              Nota Pembelian
            </h2>
              <div className="flex gap-2 flex-wrap">
                {request.purchase_receipts?.map((r) => (
                  <a
                    key={r.id}
                    href={getPhotoUrl(r.storage_path, 'request-receipts')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 block hover:opacity-80 transition-opacity"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getPhotoUrl(r.storage_path, 'request-receipts')}
                      alt="Nota"
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
          </div>
        )}
      </main>
    </div>
  );
}
