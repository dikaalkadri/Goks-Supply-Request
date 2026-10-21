'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Package, AlertCircle, Receipt,
  Camera, ExternalLink, UploadCloud, Edit2, Trash2, Plus, X, Search, Check
} from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingState } from '@/components/ui/States';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { Request, RequestItem, Item } from '@/types';
import { formatDateTime } from '@/lib/utils/format';
import { compressConditionPhoto, compressReceipt, validateImageFile } from '@/lib/utils/image-compress';
import { useOutletSession } from '@/lib/auth/use-outlet-session';
import toast from 'react-hot-toast';

function ItemCard({
  item,
  number,
  request,
  canEdit,
  onUpdate
}: {
  item: RequestItem;
  number: number;
  request: Request;
  canEdit: boolean;
  onUpdate: () => void;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const [uploadingType, setUploadingType] = useState<'photo' | 'receipt' | null>(null);

  // Edit item state
  const [isEditing, setIsEditing] = useState(false);
  const [editQty, setEditQty] = useState(item.qty);
  const [editName, setEditName] = useState(item.item_name);
  const [editUnit, setEditUnit] = useState(item.unit);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setEditQty(item.qty);
    setEditName(item.item_name);
    setEditUnit(item.unit);
  }, [item]);

  const getPhotoUrl = (path: string, bucket: string) => {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'receipt') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const err = validateImageFile(file);
    if (err) {
      toast.error(err);
      return;
    }

    setUploadingType(type);
    try {
      const compressed = type === 'photo'
        ? await compressConditionPhoto(file)
        : await compressReceipt(file);
      const bucket = type === 'photo' ? 'request-condition-photos' : 'request-receipts';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
      const filePath = `${request.id}/${fileName}`;

      // Get signed URL
      const res = await fetch('/api/upload/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucket,
          path: filePath,
          request_id: request.id,
        }),
      });

      if (!res.ok) throw new Error('Gagal mendapatkan akses upload.');
      const { signedUrl } = await res.json();

      // Upload to Supabase directly
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/webp' },
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

  const handleSaveEdit = async () => {
    if (editQty < 1) {
      toast.error('Jumlah barang minimal 1.');
      return;
    }
    if (!editName.trim()) {
      toast.error('Nama barang wajib diisi.');
      return;
    }
    if (!editUnit.trim()) {
      toast.error('Satuan wajib diisi.');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/requests/${request.id}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qty: editQty,
          item_name: editName.trim(),
          unit: editUnit.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan perubahan barang.');
      }

      toast.success('Barang berhasil diperbarui.');
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!confirm(`Hapus barang "${item.item_name}" dari permintaan ini?`)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/requests/${request.id}/items/${item.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus barang.');
      }

      toast.success(`"${item.item_name}" berhasil dihapus.`);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan.');
    } finally {
      setDeleting(false);
    }
  };

  const isConfirmedWarehouse = item.purchase_type === 'warehouse';
  const resolvedCategory = item.purchase_type === 'warehouse'
    ? 'Warehouse'
    : item.purchase_type === 'petty_cash'
    ? 'Petty Cash'
    : null;
  const recommendedCategory = item.is_manual ? 'Petty Cash' : 'Warehouse';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 relative flex flex-col h-full hover:border-gray-200 transition-all">
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="flex-1 min-w-0 pr-2">
          {isEditing ? (
            <div className="space-y-2 py-1">
              {item.is_manual ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500">Nama Barang</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500">Satuan</label>
                    <input
                      type="text"
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>
              ) : (
                <h3 className="font-bold text-gray-900">
                  <span className="text-gray-400 font-medium tabular-nums mr-1.5">{number}.</span>
                  {item.item_name}
                </h3>
              )}

              <div className="flex items-center gap-2">
                <div className="w-24">
                  <label className="text-[11px] font-semibold text-gray-500">Jumlah</label>
                  <input
                    type="number"
                    min="1"
                    value={editQty}
                    onChange={(e) => setEditQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                {!item.is_manual && (
                  <span className="text-xs text-gray-500 self-end pb-1.5 font-medium">{item.unit}</span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  <Check className="h-3 w-3" />
                  {savingEdit ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditQty(item.qty);
                    setEditName(item.item_name);
                    setEditUnit(item.unit);
                  }}
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-medium transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="font-bold text-gray-900 break-words">
                <span className="text-gray-400 font-medium tabular-nums mr-1.5">{number}.</span>
                {item.item_name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-700 font-semibold">{item.qty} {item.unit}</span>
                {item.is_manual && (
                  <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                    Manual
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <StatusBadge status={item.status ?? 'pending'} />
          {canEdit && !isEditing && (
            <div className="flex items-center gap-1 ml-1 border-l pl-1.5 border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Edit Barang"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                disabled={deleting}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Hapus Barang"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-3 border-b border-gray-50 pb-3 space-y-2 mt-1">
        <div className="flex flex-wrap items-center gap-1">
          <span className="font-semibold text-gray-700 mr-1">Kategori Pembelian:</span>
          {resolvedCategory ? (
            <span className={`px-1.5 py-0.5 rounded-md font-medium ${
              resolvedCategory === 'Petty Cash' ? 'bg-orange-50 text-orange-700' : 'bg-primary-50 text-primary-700'
            }`}>
              {resolvedCategory}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded-md font-medium bg-gray-100 text-gray-500">⏳ Progress</span>
              <span className="text-gray-400">(rekomendasi: {recommendedCategory})</span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="font-semibold text-gray-700 mr-1">Tanggal Pengiriman:</span>
          {item.delivered_at ? (
            <span className="text-gray-900 font-medium">
              {new Date(item.delivered_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })},{' '}
              {new Date(item.delivered_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : (
            <span className="text-gray-500 font-medium">-</span>
          )}
        </div>
      </div>

      {item.admin_note && (
        <div className={`text-xs mb-3 p-2 rounded-lg ${item.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'}`}>
          <span className="font-semibold">Catatan Admin:</span> {item.admin_note}
        </div>
      )}

      <div className="flex flex-row gap-4 mt-auto pt-3 border-t border-gray-50">
        {/* Bukti Barang Rusak */}
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Bukti Rusak</label>
          {item.photo_path ? (
            <div className="relative group rounded-lg overflow-hidden border border-gray-200 w-16 h-16 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getPhotoUrl(item.photo_path, 'request-condition-photos')} alt="Foto Bukti" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <a href={getPhotoUrl(item.photo_path, 'request-condition-photos')} target="_blank" rel="noopener noreferrer" className="p-1 bg-white/20 hover:bg-white/40 rounded-full text-white" title="Lihat Foto">
                  <ExternalLink className="h-3 w-3" />
                </a>
                <label className="p-1 bg-white/20 hover:bg-white/40 rounded-full text-white cursor-pointer" title="Upload Ulang">
                  <Camera className="h-3 w-3" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'photo')} disabled={uploadingType !== null} />
                </label>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-primary-300 transition-colors cursor-pointer text-gray-500 w-fit">
                {uploadingType === 'photo' ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary-500 border-t-transparent" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                <span className="text-[10px] font-medium">Upload Foto</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'photo')} disabled={uploadingType !== null} />
              </label>
            </div>
          )}
        </div>

        {/* Nota Pembelian */}
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Nota Pembelian</label>
          {resolvedCategory === null ? (
            <div className="flex items-center gap-1.5 py-1 text-amber-500 opacity-80">
              <Receipt className="h-4 w-4" />
              <span className="text-[10px] font-medium leading-tight">Menunggu<br/>keputusan</span>
            </div>
          ) : isConfirmedWarehouse ? (
            <div className="flex items-center gap-1.5 py-1 text-gray-400 opacity-80">
              <Receipt className="h-4 w-4" />
              <span className="text-[10px] font-medium leading-tight">Tidak<br/>Berlaku</span>
            </div>
          ) : item.receipt_path ? (
            <div className="relative group rounded-lg overflow-hidden border border-gray-200 w-16 h-16 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getPhotoUrl(item.receipt_path, 'request-receipts')} alt="Nota Pembelian" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <a href={getPhotoUrl(item.receipt_path, 'request-receipts')} target="_blank" rel="noopener noreferrer" className="p-1 bg-white/20 hover:bg-white/40 rounded-full text-white" title="Lihat Nota">
                  <ExternalLink className="h-3 w-3" />
                </a>
                <label className="p-1 bg-white/20 hover:bg-white/40 rounded-full text-white cursor-pointer" title="Upload Ulang">
                  <UploadCloud className="h-3 w-3" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'receipt')} disabled={uploadingType !== null} />
                </label>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-orange-300 transition-colors cursor-pointer text-orange-600 w-fit">
                {uploadingType === 'receipt' ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-orange-500 border-t-transparent" />
                ) : (
                  <Receipt className="h-3.5 w-3.5" />
                )}
                <span className="text-[10px] font-medium">Upload Nota</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'receipt')} disabled={uploadingType !== null} />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { session, loading: sessionLoading } = useOutletSession();
  const [request, setRequest] = useState<Request | null>(null);
  const [masterItems, setMasterItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace('/');
    }
  }, [session, sessionLoading, router]);

  // Note edit state
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Add Item Modal/Form state
  const [showAddItem, setShowAddItem] = useState(false);
  const [addMode, setAddMode] = useState<'master' | 'manual'>('master');
  const [addSearch, setAddSearch] = useState('');
  const [addSelectedItem, setAddSelectedItem] = useState<Item | null>(null);
  const [addQty, setAddQty] = useState(1);
  const [addManualName, setAddManualName] = useState('');
  const [addManualUnit, setAddManualUnit] = useState('');
  const [addManualQty, setAddManualQty] = useState(1);
  const [addingItem, setAddingItem] = useState(false);

  async function fetchRequest() {
    try {
      const res = await fetch(`/api/requests/${id}`);
      if (!res.ok) { setRequest(null); return; }
      const data = await res.json();
      setRequest(data.data);
      setNoteValue(data.data?.note ?? '');
    } catch {
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRequest();
    fetch('/api/items')
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setMasterItems(d.data ?? []))
      .catch(() => setMasterItems([]));
  }, [id]);

  const canEdit = request?.status === 'pending';

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteValue }),
      });
      if (!res.ok) throw new Error('Gagal memperbarui catatan.');
      toast.success('Catatan berhasil diperbarui.');
      setIsEditingNote(false);
      fetchRequest();
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan.');
    } finally {
      setSavingNote(false);
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
      if (!body.qty || body.qty < 1) { toast.error('Jumlah minimal 1.'); return; }

      const res = await fetch(`/api/requests/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menambahkan barang.');
      }

      toast.success(`"${body.item_name}" berhasil ditambahkan.`);
      setShowAddItem(false);
      setAddSelectedItem(null);
      setAddSearch('');
      setAddQty(1);
      setAddManualName('');
      setAddManualUnit('');
      setAddManualQty(1);
      fetchRequest();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambahkan barang.');
    } finally {
      setAddingItem(false);
    }
  };

  const filteredMasterItems = masterItems.filter((i) =>
    i.name.toLowerCase().includes(addSearch.toLowerCase()) ||
    (i.category && i.category.toLowerCase().includes(addSearch.toLowerCase()))
  );

  if (sessionLoading || (!session && typeof window !== 'undefined')) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Memeriksa sesi...</p>
        </div>
      </div>
    );
  }

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
            <div className="flex items-center gap-2">
              <StatusBadge status={request.status} />
              {canEdit && (
                <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                  Bisa Diedit
                </span>
              )}
            </div>
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
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-gray-600" />
              Daftar Barang
              <span className="text-sm font-normal text-gray-500">
                ({request.request_items?.length ?? 0} item)
              </span>
            </h2>
            {canEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => { setShowAddItem(true); setAddMode('master'); }}
                className="gap-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Tambah Barang
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {request.request_items?.map((item, i) => (
              <ItemCard
                key={item.id}
                item={item}
                number={i + 1}
                request={request}
                canEdit={canEdit}
                onUpdate={fetchRequest}
              />
            ))}
          </div>
        </div>

        {/* Catatan */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-900">Catatan</h2>
            {canEdit && !isEditingNote && (
              <button
                onClick={() => setIsEditingNote(true)}
                className="text-xs text-primary-600 hover:text-primary-700 font-semibold inline-flex items-center gap-1"
              >
                <Edit2 className="h-3 w-3" />
                {request.note ? 'Ubah Catatan' : 'Tambah Catatan'}
              </button>
            )}
          </div>

          {isEditingNote ? (
            <div className="space-y-3">
              <textarea
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                placeholder="Tulis catatan permintaan (opsional)..."
                rows={3}
                className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsEditingNote(false);
                    setNoteValue(request.note ?? '');
                  }}
                  disabled={savingNote}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveNote}
                  disabled={savingNote}
                >
                  {savingNote ? 'Menyimpan...' : 'Simpan Catatan'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              {request.note || <span className="text-gray-400 italic">Tidak ada catatan.</span>}
            </p>
          )}
        </div>
      </main>

      {/* Modal Tambah Barang */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">Tambah Barang ke Permintaan</h3>
              <button
                onClick={() => setShowAddItem(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Tab Mode */}
              <div className="flex rounded-xl bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => { setAddMode('master'); setAddSelectedItem(null); }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    addMode === 'master' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Dari Master Barang
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode('manual')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    addMode === 'manual' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Barang Manual
                </button>
              </div>

              {addMode === 'master' ? (
                <div className="space-y-3">
                  {!addSelectedItem ? (
                    <div>
                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Ketik nama atau kategori barang..."
                          value={addSearch}
                          onChange={(e) => setAddSearch(e.target.value)}
                          className="pl-9 text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="border border-gray-100 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-50">
                        {filteredMasterItems.length === 0 ? (
                          <div className="p-3 text-center text-xs text-gray-400">
                            {addSearch ? 'Barang tidak ditemukan' : 'Ketik untuk mencari'}
                          </div>
                        ) : (
                          filteredMasterItems.slice(0, 10).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => { setAddSelectedItem(item); setAddSearch(''); }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-primary-50 transition-colors flex items-center justify-between"
                            >
                              <span className="font-semibold text-gray-800">{item.name}</span>
                              <span className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                                {item.unit}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-primary-50 border border-primary-200 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-primary-700 font-semibold uppercase tracking-wider">Barang Dipilih</p>
                        <p className="font-bold text-gray-900 text-sm mt-0.5">{addSelectedItem.name}</p>
                        <p className="text-xs text-gray-500">Satuan: {addSelectedItem.unit}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAddSelectedItem(null)}
                        className="text-xs text-primary-600 hover:text-primary-800 underline font-medium"
                      >
                        Ganti
                      </button>
                    </div>
                  )}

                  {addSelectedItem && (
                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-1 block">
                        Jumlah ({addSelectedItem.unit})
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={addQty}
                        onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Nama Barang</label>
                    <Input
                      placeholder="Contoh: Lakban Bening"
                      value={addManualName}
                      onChange={(e) => setAddManualName(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-1 block">Satuan</label>
                      <Input
                        placeholder="Contoh: pcs, roll, rim"
                        value={addManualUnit}
                        onChange={(e) => setAddManualUnit(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-1 block">Jumlah</label>
                      <Input
                        type="number"
                        min="1"
                        value={addManualQty}
                        onChange={(e) => setAddManualQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-100 bg-gray-50">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAddItem(false)}
                disabled={addingItem}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddItem}
                disabled={addingItem || (addMode === 'master' && !addSelectedItem)}
              >
                {addingItem ? 'Menyimpan...' : 'Tambahkan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
