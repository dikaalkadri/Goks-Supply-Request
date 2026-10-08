'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, Trash2, Save, History } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Request, Outlet, RequestItem, ItemStatus, RequestLog } from '@/types';
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
  const [purchaseStatus, setPurchaseStatus] = useState<string>('');
  const [itemStatuses, setItemStatuses] = useState<Record<string, ItemStatus>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [itemPurchaseTypes, setItemPurchaseTypes] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<RequestLog[]>([]);

  const fetchLogs = () => {
    fetch(`/api/admin/requests/${id}/logs`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setLogs(d.data ?? []))
      .catch(() => setLogs([]));
  };

  useEffect(() => {
    fetchLogs();
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
        setPurchaseStatus(data.purchase_status);
        setItemStatuses(Object.fromEntries(
          (data.request_items ?? []).map((i: RequestItem) => [i.id, i.status ?? 'pending'])
        ));
        setItemNotes(Object.fromEntries(
          (data.request_items ?? []).map((i: RequestItem) => [i.id, i.admin_note ?? ''])
        ));
        setItemPurchaseTypes(Object.fromEntries(
          (data.request_items ?? []).map((i: RequestItem) => [i.id, i.purchase_type ?? ''])
        ));
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
    // Only send item fields that actually changed
    const changedItems = (request?.request_items ?? [])
      .map((i) => {
        const change: { id: string; status?: ItemStatus; admin_note?: string | null; purchase_type?: string } = { id: i.id };
        if (itemStatuses[i.id] && itemStatuses[i.id] !== (i.status ?? 'pending')) change.status = itemStatuses[i.id];
        const noteVal = (itemNotes[i.id] ?? '').trim();
        if (noteVal !== (i.admin_note ?? '')) change.admin_note = noteVal || null;
        if (itemPurchaseTypes[i.id] !== undefined && itemPurchaseTypes[i.id] !== (i.purchase_type ?? '')) {
          change.purchase_type = itemPurchaseTypes[i.id] || undefined;
        }
        return change;
      })
      .filter((c) => 'status' in c || 'admin_note' in c || 'purchase_type' in c);

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outletId,
          requester_name: requesterName.trim(),
          note: note.trim() || null,
          purchase_status: purchaseStatus,
          ...(changedItems.length > 0 && { items: changedItems }),
        }),
      });
      if (!res.ok) throw new Error();
      const { data: updated } = await res.json();
      setRequest((prev) => prev && {
        ...prev,
        status: updated?.status ?? prev.status,
        request_items: prev.request_items?.map((i) => ({
          ...i,
          status: itemStatuses[i.id] ?? i.status,
          admin_note: (itemNotes[i.id] ?? '').trim() || null,
          purchase_type: (itemPurchaseTypes[i.id] as any) ?? i.purchase_type,
        })),
      });
      fetchLogs();
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
            <div>
              <p className="block text-sm font-semibold text-gray-700 mb-1.5">Status Permintaan</p>
              <StatusBadge status={request.status} />
              <p className="text-xs text-gray-500 mt-1.5">
                Otomatis menjadi Selesai setelah semua barang diberi status.
              </p>
            </div>
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
                  <th className="py-2 text-gray-500 font-semibold text-center pl-4">Pengiriman/Pembelian</th>
                  <th className="py-2 text-gray-500 font-semibold pl-4 text-center">Foto Rusak</th>
                  <th className="py-2 text-gray-500 font-semibold pl-4 text-center">Foto Nota</th>
                  <th className="py-2 text-gray-500 font-semibold pl-4">Status</th>
                  <th className="py-2 text-gray-500 font-semibold pl-4">Catatan</th>
                  <th className="py-2 text-gray-500 font-semibold pl-4 whitespace-nowrap">Tgl Pengiriman</th>
                </tr>
              </thead>
              <tbody>
                {request.request_items?.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 font-medium">
                      <span>{item.item_name}</span>
                      {item.is_manual && (
                        <span className="ml-1 text-[10px] bg-orange-100 text-orange-700 px-1 py-0.5 rounded-full font-bold uppercase">Manual</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right">{item.qty}</td>
                    <td className="py-2.5 pl-4 text-gray-600">{item.unit}</td>
                    <td className="py-2.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <select
                          aria-label={`Tipe Pembelian ${item.item_name}`}
                          value={itemPurchaseTypes[item.id] ?? ''}
                          onChange={(e) => setItemPurchaseTypes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className={`px-2 py-1.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                            !itemPurchaseTypes[item.id]
                              ? 'border-amber-300 text-amber-700 bg-amber-50'
                              : 'border-gray-200'
                          }`}
                        >
                          <option value="">⏳ Progress</option>
                          <option value="warehouse">🏭 Warehouse</option>
                          <option value="petty_cash">💵 Petty Cash</option>
                        </select>
                        {!itemPurchaseTypes[item.id] && (
                          <span className="text-[10px] text-gray-400">
                            Rekomen: {item.is_manual ? 'Petty Cash' : 'Warehouse'}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Foto Rusak */}
                    <td className="py-2.5 pl-4 text-center">
                      {item.photo_path ? (
                        <a href={getPhotoUrl(item.photo_path, 'request-condition-photos')} target="_blank" rel="noopener noreferrer" className="inline-block w-10 h-10 rounded-lg overflow-hidden border hover:opacity-80 transition-opacity">
                          <img src={getPhotoUrl(item.photo_path, 'request-condition-photos')} alt="Foto Rusak" className="w-full h-full object-cover" />
                        </a>
                      ) : (
                        <span className="text-gray-300 text-xs">-</span>
                      )}
                    </td>
                    {/* Foto Nota */}
                    <td className="py-2.5 pl-4 text-center">
                      {item.receipt_path ? (
                        <a href={getPhotoUrl(item.receipt_path, 'request-receipts')} target="_blank" rel="noopener noreferrer" className="inline-block w-10 h-10 rounded-lg overflow-hidden border hover:opacity-80 transition-opacity">
                          <img src={getPhotoUrl(item.receipt_path, 'request-receipts')} alt="Foto Nota" className="w-full h-full object-cover" />
                        </a>
                      ) : (
                        <span className="text-gray-300 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-4">
                      <select
                        aria-label={`Status ${item.item_name}`}
                        value={itemStatuses[item.id] ?? 'pending'}
                        onChange={(e) => setItemStatuses((prev) => ({ ...prev, [item.id]: e.target.value as ItemStatus }))}
                        className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="pending">🟡 Menunggu</option>
                        <option value="completed">🟢 Selesai</option>
                        <option value="rejected">🔴 Ditolak</option>
                      </select>
                    </td>
                    <td className="py-2.5 pl-4">
                      <input
                        type="text"
                        aria-label={`Catatan admin ${item.item_name}`}
                        placeholder={itemStatuses[item.id] === 'rejected' ? 'Alasan ditolak...' : 'Catatan (opsional)'}
                        maxLength={500}
                        value={itemNotes[item.id] ?? ''}
                        onChange={(e) => setItemNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        className="w-full min-w-36 px-2 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-gray-400"
                      />
                    </td>
                    <td className="py-2.5 pl-4 whitespace-nowrap text-xs text-gray-700">
                      {item.delivered_at ? (
                        <span className="font-medium">
                          {new Date(item.delivered_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}<br/>
                          <span className="text-gray-500">{new Date(item.delivered_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 font-medium">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>



        {/* Riwayat Perubahan */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mt-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <History className="h-4 w-4 text-gray-500" /> Riwayat Perubahan
          </h2>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada riwayat.</p>
          ) : (
            <ol className="space-y-3">
              {logs.map((log) => (
                <li key={log.id} className="border-l-2 border-gray-200 pl-3">
                  <p className="text-xs text-gray-500">
                    {formatDateTime(log.created_at)} · {log.actor === 'admin' ? 'Admin' : 'Pengaju'}
                  </p>
                  {log.action === 'created' && <p className="text-sm text-gray-800">Permintaan dibuat</p>}
                  {log.action === 'deleted' && <p className="text-sm text-gray-800">Permintaan dihapus</p>}
                  {log.action === 'updated' && (
                    <ul className="text-sm text-gray-800 space-y-0.5">
                      {(log.detail?.changes ?? []).map((c, idx) => (
                        <li key={idx}>
                          <span className="font-medium">{c.label}:</span>{' '}
                          <span className="text-gray-500 line-through">{c.from || '—'}</span>{' → '}
                          <span>{c.to || '—'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
