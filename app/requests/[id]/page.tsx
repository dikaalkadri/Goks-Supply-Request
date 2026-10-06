'use client';

import { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Package, AlertCircle, Receipt,
  Camera, ExternalLink, UploadCloud
} from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingState } from '@/components/ui/States';
import Button from '@/components/ui/Button';
import type { Request, RequestItem } from '@/types';
import { formatDateTime } from '@/lib/utils/format';
import { compressConditionPhoto, validateImageFile } from '@/lib/utils/image-compress';
import toast from 'react-hot-toast';

function ItemCard({ item, request, onUpdate }: { item: RequestItem; request: Request; onUpdate: () => void }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const [uploadingType, setUploadingType] = useState<'photo' | 'receipt' | null>(null);

  const getPhotoUrl = (path: string, bucket: string) => {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  };

  const hasEditToken = () => {
    try {
      const stored = localStorage.getItem('goks_request_tokens');
      if (stored) {
        const tokens = JSON.parse(stored);
        return tokens[request.id];
      }
    } catch {}
    return null;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'receipt') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const err = validateImageFile(file);
    if (err) {
      toast.error(err);
      return;
    }

    const editToken = hasEditToken();
    if (!editToken) {
      toast.error('Anda tidak memiliki akses untuk mengupload untuk permintaan ini.');
      return;
    }

    setUploadingType(type);
    try {
      const compressed = await compressConditionPhoto(file);
      const bucket = type === 'photo' ? 'request-condition-photos' : 'request-receipts';
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${request.id}/${fileName}`;

      // Get signed URL
      const res = await fetch('/api/upload/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucket,
          path: filePath,
        }),
      });

      if (!res.ok) throw new Error('Gagal mendapatkan akses upload.');
      const { signedUrl } = await res.json();

      // Upload to Supabase directly
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: compressed,
      });

      if (!uploadRes.ok) throw new Error('Gagal mengupload file ke penyimpanan.');

      // Update Database
      const apiType = type === 'photo' ? 'item_photo' : 'item_receipt';
      const updateRes = await fetch(`/api/requests/${request.id}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_path: filePath,
          edit_token: editToken,
          type: apiType,
          request_item_id: item.id,
        }),
      });

      if (!updateRes.ok) throw new Error('Gagal memperbarui data.');

      toast.success(type === 'photo' ? 'Foto barang berhasil diupload.' : 'Nota berhasil diupload.');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan saat mengupload.');
    } finally {
      setUploadingType(null);
      if (e.target) e.target.value = '';
    }
  };

  const isWarehouse = item.purchase_type === 'warehouse' || (item.purchase_type == null && !item.is_manual);
  // Default to Petty Cash logic if manual, but backend sets purchase_type appropriately. 
  // We'll use purchase_type if available.
  const resolvedCategory = item.purchase_type 
    ? (item.purchase_type === 'warehouse' ? 'Warehouse' : 'Petty Cash')
    : (item.is_manual ? 'Petty Cash' : 'Warehouse');

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 relative flex flex-col h-full">
      <div className="flex justify-between items-start mb-2 gap-2">
        <div>
          <h3 className="font-bold text-gray-900">{item.item_name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-600 font-medium">{item.qty} {item.unit}</span>
            {item.is_manual && (
              <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                Manual
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={item.status ?? 'pending'} />
      </div>

      <div className="text-xs text-gray-500 mb-3 border-b border-gray-50 pb-3">
        <span className="font-semibold text-gray-700 mr-1">Kategori Pembelian:</span>
        <span className={`px-1.5 py-0.5 rounded-md ${resolvedCategory === 'Petty Cash' ? 'bg-orange-50 text-orange-700' : 'bg-primary-50 text-primary-700'}`}>
          {resolvedCategory}
        </span>
      </div>

      {item.admin_note && (
        <div className={`text-xs mb-3 p-2 rounded-lg ${item.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'}`}>
          <span className="font-semibold">Catatan Admin:</span> {item.admin_note}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mt-auto pt-2">
        {/* Foto Bukti */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Foto Bukti Barang</label>
          {item.photo_path ? (
            <div className="relative group rounded-xl overflow-hidden border border-gray-200 aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPhotoUrl(item.photo_path, 'request-condition-photos')}
                alt="Foto Bukti"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                <a 
                  href={getPhotoUrl(item.photo_path, 'request-condition-photos')} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-colors"
                  title="Lihat Foto"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <label className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-colors cursor-pointer" title="Upload Ulang">
                  <Camera className="h-4 w-4" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleUpload(e, 'photo')} 
                    disabled={uploadingType !== null}
                  />
                </label>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 hover:border-primary-300 transition-colors cursor-pointer relative">
              {uploadingType === 'photo' ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent" />
              ) : (
                <>
                  <Camera className="h-5 w-5 text-gray-400 mb-1" />
                  <span className="text-[10px] text-gray-500 font-medium">Upload Foto</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'photo')} disabled={uploadingType !== null} />
            </label>
          )}
        </div>

        {/* Nota Pembelian */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nota Pembelian</label>
          {resolvedCategory === 'Warehouse' ? (
            <div className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50 opacity-60">
              <Receipt className="h-5 w-5 text-gray-300 mb-1" />
              <span className="text-[10px] text-gray-400 font-medium text-center px-2">Tidak Berlaku</span>
            </div>
          ) : item.receipt_path ? (
            <div className="relative group rounded-xl overflow-hidden border border-gray-200 aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPhotoUrl(item.receipt_path, 'request-receipts')}
                alt="Nota Pembelian"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                <a 
                  href={getPhotoUrl(item.receipt_path, 'request-receipts')} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-colors"
                  title="Lihat Nota"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <label className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-colors cursor-pointer" title="Upload Ulang">
                  <UploadCloud className="h-4 w-4" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleUpload(e, 'receipt')} 
                    disabled={uploadingType !== null}
                  />
                </label>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 hover:border-orange-300 transition-colors cursor-pointer relative text-orange-600">
              {uploadingType === 'receipt' ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent" />
              ) : (
                <>
                  <Receipt className="h-5 w-5 opacity-70 mb-1" />
                  <span className="text-[10px] font-medium opacity-80">Upload Nota</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'receipt')} disabled={uploadingType !== null} />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchRequest() {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PublicNav />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <LoadingState text="Memuat permintaan..." />
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PublicNav />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-gray-900">Permintaan tidak ditemukan.</h1>
          <Link href="/requests" className="mt-4 inline-block">
            <Button variant="secondary" size="sm">← Kembali ke Daftar</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />
      <main className="max-w-3xl mx-auto px-4 py-6 pb-20">
        {/* Back */}
        <Link href="/requests" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 font-medium">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-primary-700">{request.request_code}</h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">
                {formatDateTime(request.created_at)}
              </p>
            </div>
            <StatusBadge status={request.status} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div>
              <p className="text-gray-400 text-[11px] uppercase tracking-wider font-bold mb-1">Outlet</p>
              <p className="font-semibold text-gray-900">{request.outlet?.name ?? '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-[11px] uppercase tracking-wider font-bold mb-1">Pengaju</p>
              <p className="font-semibold text-gray-900">{request.requester_name}</p>
            </div>
          </div>
        </div>

        {/* Daftar Barang (Cards) */}
        <div className="mb-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-gray-600" />
            Daftar Barang
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {request.request_items?.map((item) => (
              <ItemCard key={item.id} item={item} request={request} onUpdate={fetchRequest} />
            ))}
          </div>
        </div>

        {/* Catatan */}
        {request.note && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <h2 className="font-semibold text-gray-900 mb-2">Catatan</h2>
            <p className="text-sm text-gray-600">{request.note}</p>
          </div>
        )}
      </main>
    </div>
  );
}
