'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, Trash2, Camera, Receipt, ExternalLink, Save } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { LoadingState } from '@/components/ui/States';
import type { Request, Outlet } from '@/types';
import { formatDateTime } from '@/lib/utils/format';
import toast from 'react-hot-toast';

export default function AdminRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [request, setRequest] = useState<Request | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

  // Edit states
  const [outletId, setOutletId] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<string>('');
  const [purchaseStatus, setPurchaseStatus] = useState<string>('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/requests/${id}`).then((r) => r.ok ? r.json() : { data: null }),
      fetch('/api/admin/outlets').then((r) => r.ok ? r.json() : { data: [] }),
    ]).then(([reqData, outletsData]) => {
      const data = reqData.data;
      setRequest(data);
      if (data) {
        setOutletId(data.outlet_id);
        setRequesterName(data.requester_name);
        setNote(data.note ?? '');
        setStatus(data.status);
        setPurchaseStatus(data.purchase_status);
      }
      setOutlets(outletsData.data ?? []);
      setLoading(false);
    });
  }, [id]);

  const handleSave = async () => {
    if (!outletId || !requesterName.trim()) {
      toast.error('Outlet dan Nama Pengaju wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outletId,
          requester_name: requesterName.trim(),
          note: note.trim() || null,
          status,
          purchase_status: purchaseStatus,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Permintaan berhasil diperbarui.');
      router.refresh();
    } catch {
      toast.error('Gagal memperbarui permintaan.');
    } finally {
      setSaving(false);
    }
  };

  const getPhotoUrl = (path: string, bucket: string) => {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  };

  if (loading) {
    return <AdminLayout><LoadingState text="Memuat permintaan..." /></AdminLayout>;
  }

  if (!request) {
    return (
      <AdminLayout>
        <div className="p-6 text-center">
          <p className="text-gray-500 mb-4">Permintaan tidak ditemukan.</p>
          <Link href="/admin/requests"><Button variant="secondary">Kembali</Button></Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl">
        <Link href="/admin/requests" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{request.request_code}</h1>
            <p className="text-sm text-gray-500 mt-1">{formatDateTime(request.created_at)}</p>
          </div>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            <Save className="h-4 w-4" /> Simpan Perubahan
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Informasi Umum</h2>
            <Select
              label="Outlet"
              value={outletId}
              onChange={(e) => setOutletId(e.target.value)}
              options={outlets.map((o) => ({ value: o.id, label: o.name }))}
            />
            <Input
              label="Nama Pengaju"
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
            />
            <div className="w-full">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Catatan</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Status</h2>
            <Select
              label="Status Permintaan"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'pending', label: '🟡 Menunggu' },
                { value: 'processing', label: '🔵 Diproses' },
                { value: 'completed', label: '🟢 Selesai' },
                { value: 'rejected', label: '🔴 Ditolak' },
              ]}
            />
            <Select
              label="Status Pembelian"
              value={purchaseStatus}
              onChange={(e) => setPurchaseStatus(e.target.value)}
              options={[
                { value: 'not_purchased', label: '🟡 Belum Dibeli' },
                { value: 'purchased', label: '🟢 Sudah Dibeli' },
              ]}
            />
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-500" /> Daftar Barang
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2 text-gray-500 font-semibold">Nama Barang</th>
                  <th className="py-2 text-gray-500 font-semibold text-right">Qty</th>
                  <th className="py-2 text-gray-500 font-semibold pl-4">Satuan</th>
                  <th className="py-2 text-gray-500 font-semibold text-center">Tipe</th>
                </tr>
              </thead>
              <tbody>
                {request.request_items?.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 font-medium">{item.item_name}</td>
                    <td className="py-2.5 text-right">{item.qty}</td>
                    <td className="py-2.5 pl-4 text-gray-600">{item.unit}</td>
                    <td className="py-2.5 text-center">
                      {item.is_manual ? (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Manual</span>
                      ) : (
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">Master</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Media */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Camera className="h-4 w-4 text-gray-500" /> Foto Kondisi
            </h2>
            {(request.request_photos?.length ?? 0) > 0 ? (
              <div className="flex flex-wrap gap-2">
                {request.request_photos?.map((p) => (
                  <a key={p.id} href={getPhotoUrl(p.storage_path, 'request-condition-photos')} target="_blank" rel="noopener noreferrer" className="relative w-24 h-24 rounded-lg overflow-hidden border group">
                    <img src={getPhotoUrl(p.storage_path, 'request-condition-photos')} alt="Foto" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><ExternalLink className="h-4 w-4 text-white"/></div>
                  </a>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">Tidak ada foto.</p>}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-gray-500" /> Nota Pembelian
            </h2>
            {(request.purchase_receipts?.length ?? 0) > 0 ? (
              <div className="flex flex-wrap gap-2">
                {request.purchase_receipts?.map((p) => (
                  <a key={p.id} href={getPhotoUrl(p.storage_path, 'request-receipts')} target="_blank" rel="noopener noreferrer" className="relative w-24 h-24 rounded-lg overflow-hidden border group">
                    <img src={getPhotoUrl(p.storage_path, 'request-receipts')} alt="Nota" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><ExternalLink className="h-4 w-4 text-white"/></div>
                  </a>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">Tidak ada nota.</p>}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
