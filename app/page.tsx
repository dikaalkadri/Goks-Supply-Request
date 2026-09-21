'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ShoppingBag, CheckCircle, Camera, Package } from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import SearchableSelect from '@/components/ui/SearchableSelect';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { compressConditionPhoto, validateImageFile } from '@/lib/utils/image-compress';
import type { Outlet, Item, ItemFormData } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface SuccessState {
  request_code: string;
  request_id: string;
  edit_token: string;
}

export default function HomePage() {
  const router = useRouter();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  // Form state
  const [outletId, setOutletId] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [note, setNote] = useState('');
  const [selectedItems, setSelectedItems] = useState<ItemFormData[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      try {
        const [outRes, itemRes] = await Promise.all([
          fetch('/api/outlets'),
          fetch('/api/items'),
        ]);
        const outData = await outRes.json();
        const itemData = await itemRes.json();
        setOutlets(outData.data ?? []);
        setItems(itemData.data ?? []);
      } catch {
        toast.error('Gagal memuat data. Silakan refresh halaman.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const addMasterItem = () => {
    setSelectedItems((prev) => [
      ...prev,
      { item_id: '', item_name: '', unit: '', qty: 1, is_manual: false },
    ]);
  };

  const addManualItem = () => {
    setSelectedItems((prev) => [
      ...prev,
      { item_id: null, item_name: '', unit: '', qty: 1, is_manual: true },
    ]);
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    setSelectedItems((prev) => {
      const updated = [...prev];
      if (updated[index].is_manual) {
        (updated[index] as any)[field] = value;
      } else {
        if (field === 'item_id') {
          const master = items.find((i) => i.id === value);
          updated[index] = {
            ...updated[index],
            item_id: value as string,
            item_name: master?.name ?? '',
            unit: master?.unit ?? '',
          };
        } else {
          (updated[index] as any)[field] = value;
        }
      }
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = 3 - photoFiles.length;
    const toAdd = files.slice(0, remaining);

    for (const file of toAdd) {
      const err = validateImageFile(file);
      if (err) { toast.error(err); continue; }
      setPhotoPreviews((p) => [...p, URL.createObjectURL(file)]);
      setPhotoFiles((p) => [...p, file]);
    }
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotoFiles((p) => p.filter((_, i) => i !== index));
    setPhotoPreviews((p) => p.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!outletId) newErrors.outlet = 'Outlet wajib dipilih.';
    if (!requesterName.trim()) newErrors.requester = 'Nama pengaju wajib diisi.';
    if (selectedItems.length === 0) newErrors.items = 'Minimal satu barang harus ditambahkan.';
    for (const [i, item] of selectedItems.entries()) {
      if (!item.item_name.trim()) newErrors[`item_name_${i}`] = 'Nama barang wajib diisi.';
      if (!item.qty || item.qty <= 0) newErrors[`item_qty_${i}`] = 'Qty harus lebih dari 0.';
      if (!item.unit.trim()) newErrors[`item_unit_${i}`] = 'Satuan wajib diisi.';
      if (!item.is_manual && !item.item_id) newErrors[`item_select_${i}`] = 'Pilih barang dari daftar.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Periksa kembali form sebelum mengirim.');
      return;
    }
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outletId,
          requester_name: requesterName.trim(),
          note: note.trim() || null,
          items: selectedItems,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || 'Terjadi kesalahan. Silakan coba lagi.');
        setSubmitting(false);
        return;
      }

      const { request_code, request_id, edit_token } = result.data;

      // Upload photos if any
      if (photoFiles.length > 0) {
        for (const [idx, file] of photoFiles.entries()) {
          try {
            const compressed = await compressConditionPhoto(file);
            const storagePath = `${request_code}/photo-${idx + 1}.webp`;

            const signedRes = await fetch('/api/upload/signed-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bucket: 'request-condition-photos',
                path: storagePath,
                token: edit_token,
              }),
            });

            if (signedRes.ok) {
              const { signedUrl } = await signedRes.json();
              await fetch(signedUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'image/webp' },
                body: compressed,
              });
              await fetch(`/api/requests/${request_id}/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storage_path: storagePath, edit_token, type: 'photo' }),
              });
            }
          } catch {
            // Non-blocking — request already created
          }
        }
      }

      // Save edit_token to localStorage
      const tokens = JSON.parse(localStorage.getItem('request_tokens') ?? '{}');
      tokens[request_id] = edit_token;
      localStorage.setItem('request_tokens', JSON.stringify(tokens));

      setSuccess({ request_code, request_id, edit_token });
    } catch {
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PublicNav />
        <div className="max-w-lg mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center fade-in">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Permintaan Berhasil!</h1>
            <div className="inline-block bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mb-3">
              <p className="text-2xl font-bold text-primary-700 tracking-wider">{success.request_code}</p>
            </div>
            <p className="text-gray-500 text-sm mb-2">Permintaan barang berhasil dikirim.</p>
            <div className="mb-6">
              <StatusBadge status="pending" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href={`/requests/${success.request_id}`} className="flex-1">
                <Button variant="primary" fullWidth size="lg">
                  Lihat Permintaan
                </Button>
              </Link>
              <Button
                variant="secondary"
                fullWidth
                size="lg"
                onClick={() => {
                  setSuccess(null);
                  setOutletId('');
                  setRequesterName('');
                  setNote('');
                  setSelectedItems([]);
                  setPhotoFiles([]);
                  setPhotoPreviews([]);
                }}
              >
                Buat Baru
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Permintaan Barang</h1>
          <p className="text-gray-500 text-sm mt-1">Ajukan kebutuhan barang outlet dengan mudah.</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-12 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Memuat data...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Outlet */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <SearchableSelect
                id="outlet"
                label="Outlet"
                required
                placeholder="Pilih Outlet"
                options={outlets.map((o) => ({ value: o.id, label: o.name, sub: o.code }))}
                value={outletId}
                onChange={setOutletId}
                error={errors.outlet}
              />
            </div>

            {/* Nama Pengaju */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <Input
                id="requester"
                label="Nama Pengaju"
                required
                placeholder="Masukkan nama"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                error={errors.requester}
              />
            </div>

            {/* Daftar Barang */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Barang</h2>
                {errors.items && <p className="text-xs text-red-600">{errors.items}</p>}
              </div>

              {selectedItems.map((item, index) => (
                <div key={index} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {item.is_manual ? '⚡ Barang Manual' : `Barang ${index + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>

                  {item.is_manual ? (
                    <Input
                      placeholder="Nama barang (contoh: Kardus bekas ukuran besar)"
                      value={item.item_name}
                      onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                      error={errors[`item_name_${index}`]}
                    />
                  ) : (
                    <SearchableSelect
                      placeholder="Pilih barang"
                      options={items.map((i) => ({ value: i.id, label: i.name, sub: i.unit }))}
                      value={item.item_id || ''}
                      onChange={(val) => updateItem(index, 'item_id', val)}
                      error={errors[`item_select_${index}`] || errors[`item_name_${index}`]}
                    />
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      placeholder="Qty"
                      min="0.01"
                      step="any"
                      value={item.qty || ''}
                      onChange={(e) => updateItem(index, 'qty', parseFloat(e.target.value) || 0)}
                      error={errors[`item_qty_${index}`]}
                    />
                    <Input
                      placeholder="Satuan (pcs, box, kg...)"
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      error={errors[`item_unit_${index}`]}
                    />
                  </div>
                </div>
              ))}

              <div className="flex gap-2 flex-wrap">
                <Button type="button" variant="outline" size="sm" onClick={addMasterItem}>
                  <Plus className="h-4 w-4" />
                  Tambah Barang
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={addManualItem}>
                  <Package className="h-4 w-4" />
                  Barang Lainnya
                </Button>
              </div>
            </div>

            {/* Catatan */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Catatan / Keterangan <span className="text-gray-400 font-normal">(opsional)</span>
              </label>
              <textarea
                placeholder="Contoh: Stok hampir habis, atau barang rusak dan perlu penggantian."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400 resize-none hover:border-gray-300 transition-all"
              />
            </div>

            {/* Foto Kondisi */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-gray-600" />
                <h2 className="font-semibold text-gray-900">Foto Kondisi Barang</h2>
                <span className="text-xs text-gray-400 font-normal">(opsional)</span>
              </div>

              {photoPreviews.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {photoPreviews.map((src, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Foto ${i+1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                      >
                        <Trash2 className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {photoFiles.length < 3 && (
                <label className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary-400 hover:bg-primary-50 cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  <Camera className="h-5 w-5 text-primary-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">📷 Tambah Foto</p>
                    <p className="text-xs text-gray-400">{3 - photoFiles.length} slot tersisa · JPG, PNG, WebP</p>
                  </div>
                </label>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              loading={submitting}
              className="shadow-lg shadow-primary-200"
            >
              <ShoppingBag className="h-5 w-5" />
              {submitting ? 'Mengirim Permintaan...' : 'Kirim Permintaan'}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
