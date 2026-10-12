'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, Trash2, Save, History, Plus, X, Search } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Request, Outlet, RequestItem, ItemStatus, RequestLog, Item } from '@/types';
import { formatDateTime } from '@/lib/utils/format';
import toast from 'react-hot-toast';

export default function AdminRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [request, setRequest] = useState<Request | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [masterItems, setMasterItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

  // Edit states
  const [outletId, setOutletId] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [note, setNote] = useState('');
  const [purchaseStatus, setPurchaseStatus] = useState<string>('');
  const [itemStatuses, setItemStatuses] = useState<Record<string, ItemStatus>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [itemPurchaseTypes, setItemPurchaseTypes] = useState<Record<string, string>>({});
  const [itemDeliveredAts, setItemDeliveredAts] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<RequestLog[]>([]);

  // Add item form state
  const [addMode, setAddMode] = useState<'master' | 'manual'>('master');
  const [addSearch, setAddSearch] = useState('');
  const [addSelectedItem, setAddSelectedItem] = useState<Item | null>(null);
  const [addQty, setAddQty] = useState(1);
  const [addManualName, setAddManualName] = useState('');
  const [addManualUnit, setAddManualUnit] = useState('');
  const [addManualQty, setAddManualQty] = useState(1);

  const toLocalISOString = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const fetchLogs = () => {
    fetch(`/api/admin/requests/${id}/logs`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setLogs(d.data ?? []))
      .catch(() => setLogs([]));
  };

  const fetchRequest = () =>
    fetch(`/api/admin/requests/${id}`)
      .then((r) => (r.ok ? r.json() : { data: null }))
      .then(({ data }) => {
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
          setItemDeliveredAts(Object.fromEntries(
            (data.request_items ?? []).map((i: RequestItem) => [i.id, toLocalISOString(i.delivered_at)])
          ));
        }
      });

  useEffect(() => {
    fetchLogs();
    Promise.all([
      fetchRequest(),
      fetch('/api/admin/outlets').then((r) => r.ok ? r.json() : { data: [] }),
      fetch('/api/admin/items').then((r) => r.ok ? r.json() : { data: [] }),
    ]).then(([, outletsData, itemsData]) => {
      setOutlets(outletsData.data ?? []);
      setMasterItems((itemsData.data ?? []).filter((i: Item) => i.is_active));
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async () => {
    if (!outletId || !requesterName.trim()) {
      toast.error('Outlet dan Nama Pengaju wajib diisi.');
      return;
    }
    const changedItems = (request?.request_items ?? [])
      .map((i) => {
        const change: { id: string; status?: ItemStatus; admin_note?: string | null; purchase_type?: string; delivered_at?: string | null } = { id: i.id };
        if (itemStatuses[i.id] && itemStatuses[i.id] !== (i.status ?? 'pending')) change.status = itemStatuses[i.id];
        const noteVal = (itemNotes[i.id] ?? '').trim();
        if (noteVal !== (i.admin_note ?? '')) change.admin_note = noteVal || null;
        if (itemPurchaseTypes[i.id] !== undefined && itemPurchaseTypes[i.id] !== (i.purchase_type ?? '')) {
          change.purchase_type = itemPurchaseTypes[i.id] || undefined;
        }
        const deliveredAtVal = itemDeliveredAts[i.id];
        const oldDeliveredAt = toLocalISOString(i.delivered_at);
        if (deliveredAtVal !== undefined && deliveredAtVal !== oldDeliveredAt) {
          change.delivered_at = deliveredAtVal ? new Date(deliveredAtVal).toISOString() : null;
        }
        return change;
      })
      .filter((c) => 'status' in c || 'admin_note' in c || 'purchase_type' in c || 'delivered_at' in c);

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
          delivered_at: itemDeliveredAts[i.id] !== undefined
            ? (itemDeliveredAts[i.id] ? new Date(itemDeliveredAts[i.id]).toISOString() : null)
            : i.delivered_at,
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

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!confirm(`Hapus barang "${itemName}" dari permintaan ini?`)) return;
    setDeletingItemId(itemId);
    try {
      const res = await fetch(`/api/admin/requests/${id}/items/${itemId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus barang.');
      }
      setRequest((prev) => prev ? {
        ...prev,
        request_items: prev.request_items?.filter((i) => i.id !== itemId),
      } : prev);
      fetchLogs();
      toast.success(`"${itemName}" berhasil dihapus.`);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus barang.');
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleAddItem = async () => {
    setAddingItem(true);
    try {
      const body = addMode === 'master' && addSelectedItem
        ? { item_id: addSelectedItem.id, item_name: addSelectedItem.name, unit: addSelectedItem.unit, qty: addQty, is_manual: false }
        : { item_id: null, item_name: addManualName.trim(), unit: addManualUnit.trim(), qty: addManualQty, is_manual: true };

      if (!body.item_name) { toast.error('Nama barang wajib diisi.'); return; }
      if (!body.unit) { toast.error('Satuan wajib diisi.'); return; }

      const res = await fetch(`/api/admin/requests/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menambah barang.');
      }
      const { data: newItem } = await res.json();
      setRequest((prev) => prev ? {
        ...prev,
        request_items: [...(prev.request_items ?? []), newItem],
      } : prev);
      setItemStatuses((s) => ({ ...s, [newItem.id]: 'pending' }));
      setItemNotes((s) => ({ ...s, [newItem.id]: '' }));
      setItemPurchaseTypes((s) => ({ ...s, [newItem.id]: '' }));
      setItemDeliveredAts((s) => ({ ...s, [newItem.id]: '' }));
      fetchLogs();
      toast.success(`"${body.item_name}" berhasil ditambahkan.`);
      // Reset form
      setShowAddItem(false);
      setAddSearch('');
      setAddSelectedItem(null);
      setAddQty(1);
      setAddManualName('');
      setAddManualUnit('');
      setAddManualQty(1);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambah barang.');
    } finally {
      setAddingItem(false);
    }
  };

  const getPhotoUrl = (path: string, bucket: string) => {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  };

  const filteredMasterItems = masterItems.filter((i) =>
    i.name.toLowerCase().includes(addSearch.toLowerCase()) ||
    (i.category ?? '').toLowerCase().includes(addSearch.toLowerCase())
  );

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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-500" /> Daftar Barang
              <span className="text-xs font-normal text-gray-400">({request.request_items?.length ?? 0} barang)</span>
            </h2>
            <button
              onClick={() => setShowAddItem((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              {showAddItem ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showAddItem ? 'Tutup' : 'Tambah Barang'}
            </button>
          </div>

          {/* Add Item Form */}
          {showAddItem && (
            <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
              <p className="text-sm font-semibold text-blue-800">Tambah Barang Baru</p>
              {/* Mode tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setAddMode('master')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${addMode === 'master' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                >
                  Dari Master Barang
                </button>
                <button
                  onClick={() => setAddMode('manual')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${addMode === 'manual' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                >
                  Manual
                </button>
              </div>

              {addMode === 'master' ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Cari barang..."
                      value={addSearch}
                      onChange={(e) => { setAddSearch(e.target.value); setAddSelectedItem(null); }}
                      className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {addSearch && !addSelectedItem && (
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white divide-y divide-gray-100">
                      {filteredMasterItems.length === 0 ? (
                        <p className="text-xs text-gray-400 p-3">Barang tidak ditemukan</p>
                      ) : filteredMasterItems.slice(0, 10).map((item) => (
                        <button
                          key={item.id}
                          onClick={() => { setAddSelectedItem(item); setAddSearch(item.name); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="text-gray-400 ml-2 text-xs">/ {item.unit}</span>
                          {item.category && <span className="text-gray-400 ml-1 text-xs">· {item.category}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {addSelectedItem && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm">
                        <span className="font-medium">{addSelectedItem.name}</span>
                        <span className="text-gray-400 ml-2 text-xs">/ {addSelectedItem.unit}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600">Qty:</label>
                        <input
                          type="number"
                          min={1}
                          value={addQty}
                          onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-20 px-2 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Nama barang *"
                      value={addManualName}
                      onChange={(e) => setAddManualName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Satuan *"
                    value={addManualUnit}
                    onChange={(e) => setAddManualUnit(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="Qty *"
                    value={addManualQty}
                    onChange={(e) => setAddManualQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  variant="primary"
                  onClick={handleAddItem}
                  loading={addingItem}
                  disabled={addMode === 'master' ? !addSelectedItem : !addManualName.trim() || !addManualUnit.trim()}
                >
                  <Plus className="h-4 w-4" /> Tambah
                </Button>
                <Button variant="secondary" onClick={() => setShowAddItem(false)}>
                  Batal
                </Button>
              </div>
            </div>
          )}

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
                  <th className="py-2 text-gray-500 font-semibold pl-4"></th>
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
                      <input
                        type="datetime-local"
                        aria-label={`Tgl Pengiriman ${item.item_name}`}
                        value={itemDeliveredAts[item.id] || ''}
                        onChange={(e) => setItemDeliveredAts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </td>
                    <td className="py-2.5 pl-2">
                      <button
                        onClick={() => handleDeleteItem(item.id, item.item_name)}
                        disabled={deletingItemId === item.id}
                        aria-label={`Hapus ${item.item_name}`}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Hapus barang ini"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(request.request_items?.length ?? 0) === 0 && (
              <p className="text-center text-sm text-gray-400 py-6">Belum ada barang. Klik "Tambah Barang" untuk menambahkan.</p>
            )}
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