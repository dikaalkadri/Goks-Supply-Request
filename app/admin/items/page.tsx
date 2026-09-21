'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { LoadingState } from '@/components/ui/States';
import type { Item } from '@/types';
import toast from 'react-hot-toast';

export default function AdminItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/items');
      const data = await res.json();
      setItems(data.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const openModal = (item?: Item) => {
    if (item) {
      setEditId(item.id);
      setName(item.name);
      setUnit(item.unit);
      setCategory(item.category ?? '');
      setIsActive(item.is_active);
    } else {
      setEditId(null);
      setName('');
      setUnit('');
      setCategory('');
      setIsActive(true);
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !unit.trim()) {
      toast.error('Nama dan Satuan wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const method = editId ? 'PATCH' : 'POST';
      const body = { id: editId, name, unit, category, is_active: isActive };
      
      const res = await fetch('/api/admin/items', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!res.ok) throw new Error();
      
      toast.success(editId ? 'Barang diperbarui.' : 'Barang ditambahkan.');
      setModalOpen(false);
      fetchItems();
    } catch {
      toast.error('Gagal menyimpan barang.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = items.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    (i.category?.toLowerCase() || '').includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Master Barang</h1>
            <p className="text-sm text-gray-500 mt-0.5">Kelola daftar barang yang bisa dipilih crew.</p>
          </div>
          <Button onClick={() => openModal()}><Plus className="h-4 w-4" /> Tambah Barang</Button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Cari barang atau kategori..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
              />
            </div>
          </div>
          
          {loading ? (
            <LoadingState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-gray-500 font-semibold uppercase text-xs">Nama Barang</th>
                    <th className="px-4 py-3 text-gray-500 font-semibold uppercase text-xs">Satuan</th>
                    <th className="px-4 py-3 text-gray-500 font-semibold uppercase text-xs">Kategori</th>
                    <th className="px-4 py-3 text-gray-500 font-semibold uppercase text-xs text-center">Status</th>
                    <th className="px-4 py-3 text-gray-500 font-semibold uppercase text-xs text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">Data tidak ditemukan.</td></tr>
                  ) : (
                    filtered.map(item => (
                      <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-400" /> {item.name}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{item.unit}</td>
                        <td className="px-4 py-3 text-gray-600">{item.category || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {item.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openModal(item)} className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                            <Edit className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => !saving && setModalOpen(false)} title={editId ? 'Edit Barang' : 'Tambah Barang'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nama Barang" required value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Cup 22 oz" />
          <Input label="Satuan" required value={unit} onChange={e => setUnit(e.target.value)} placeholder="Contoh: box" />
          <Input label="Kategori" value={category} onChange={e => setCategory(e.target.value)} placeholder="Contoh: Packaging" />
          
          {editId && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-gray-50 rounded-xl">
              <input type="checkbox" id="active" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
              <label htmlFor="active" className="text-sm font-medium text-gray-700">Barang Aktif</label>
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <Button type="button" variant="secondary" fullWidth onClick={() => setModalOpen(false)} disabled={saving}>Batal</Button>
            <Button type="submit" variant="primary" fullWidth loading={saving}>Simpan</Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
