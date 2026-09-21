'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Package, AlertCircle, CheckCircle2, Receipt,
  Camera, ExternalLink, ShoppingCart
} from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import { StatusBadge, PurchaseStatusBadge } from '@/components/ui/StatusBadge';
import { LoadingState } from '@/components/ui/States';
import Button from '@/components/ui/Button';
import PhotoUploader from '@/components/request/PhotoUploader';
import type { Request } from '@/types';
import { formatDateTime } from '@/lib/utils/format';
import toast from 'react-hot-toast';

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [editToken, setEditToken] = useState<string | null>(null);
  const [updatingPurchase, setUpdatingPurchase] = useState(false);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

  useEffect(() => {
    const tokens = JSON.parse(localStorage.getItem('request_tokens') ?? '{}');
    setEditToken(tokens[id] ?? null);
  }, [id]);

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

  const updatePurchaseStatus = async (status: 'purchased' | 'not_purchased') => {
    if (!editToken) {
      toast.error('Anda tidak memiliki akses untuk mengubah permintaan ini.');
      return;
    }
    setUpdatingPurchase(true);
    try {
      const res = await fetch(`/api/requests/${id}/purchase`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchase_status: status, edit_token: editToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal memperbarui status pembelian.');
        return;
      }
      toast.success('Status pembelian diperbarui.');
      fetchRequest();
    } catch {
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setUpdatingPurchase(false);
    }
  };

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
  const canEdit = Boolean(editToken);

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
            <div className="flex flex-col items-end gap-1.5">
              <StatusBadge status={request.status} />
              <PurchaseStatusBadge status={request.purchase_status} />
            </div>
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

        {/* Status Pembelian — workflow crew */}
        {canEdit && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-gray-600" />
              Status Pembelian
            </h2>
            <p className="text-sm text-gray-500 mb-3">Apakah barang sudah dibeli?</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => updatePurchaseStatus('not_purchased')}
                disabled={updatingPurchase}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
                  request.purchase_status === 'not_purchased'
                    ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-yellow-300'
                }`}
              >
                🟡 Belum Dibeli
              </button>
              <button
                onClick={() => updatePurchaseStatus('purchased')}
                disabled={updatingPurchase}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
                  request.purchase_status === 'purchased'
                    ? 'border-green-400 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'
                }`}
              >
                🟢 Sudah Dibeli
              </button>
            </div>

            {/* Nota upload - tampil jika sudah dibeli */}
            {request.purchase_status === 'purchased' && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Nota Pembelian
                </h3>
                {hasReceiptPhotos ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Nota tersedia ({request.purchase_receipts?.length} foto)</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {request.purchase_receipts?.map((r) => (
                        <a
                          key={r.id}
                          href={getPhotoUrl(r.storage_path, 'request-receipts')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 block hover:opacity-80 transition-opacity"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getPhotoUrl(r.storage_path, 'request-receipts')}
                            alt="Nota"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/30 transition-opacity">
                            <ExternalLink className="h-4 w-4 text-white" />
                          </div>
                        </a>
                      ))}
                    </div>
                    {(request.purchase_receipts?.length ?? 0) < 3 && (
                      <PhotoUploader
                        requestId={request.id}
                        requestCode={request.request_code}
                        editToken={editToken!}
                        type="receipt"
                        existingCount={request.purchase_receipts?.length ?? 0}
                        onUploadSuccess={() => fetchRequest()}
                        supabaseUrl={supabaseUrl}
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>⚠️ Nota belum diupload</span>
                    </div>
                    <PhotoUploader
                      requestId={request.id}
                      requestCode={request.request_code}
                      editToken={editToken!}
                      type="receipt"
                      existingCount={0}
                      onUploadSuccess={() => fetchRequest()}
                      supabaseUrl={supabaseUrl}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
                </tr>
              </thead>
              <tbody>
                {request.request_items?.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5">
                      <span className="font-medium text-gray-900">{item.item_name}</span>
                      {item.is_manual && (
                        <span className="ml-1.5 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-gray-900">{item.qty}</td>
                    <td className="py-2.5 pl-3 text-gray-500">{item.unit}</td>
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

        {/* Foto Kondisi */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Camera className="h-4 w-4 text-gray-600" />
            Foto Kondisi Barang
          </h2>
          {hasConditionPhotos ? (
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
          ) : (
            <div>
              <p className="text-sm text-gray-400 mb-3">Belum ada foto kondisi barang.</p>
              {canEdit && (request.request_photos?.length ?? 0) < 3 && (
                <PhotoUploader
                  requestId={request.id}
                  requestCode={request.request_code}
                  editToken={editToken!}
                  type="photo"
                  existingCount={request.request_photos?.length ?? 0}
                  onUploadSuccess={() => fetchRequest()}
                  supabaseUrl={supabaseUrl}
                />
              )}
            </div>
          )}
        </div>

        {/* Nota Pembelian — read-only view if not owner */}
        {!canEdit && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-gray-600" />
              Nota Pembelian
            </h2>
            {hasReceiptPhotos ? (
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
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>⚠️ Nota pembelian belum diupload.</span>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
