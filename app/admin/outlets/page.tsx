'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, Edit } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { LoadingState } from '@/components/ui/States';
import type { Outlet } from '@/types';
import toast from 'react-hot-toast';

export default function AdminOutletsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchOutlets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/outlets');
      const data = await res.json();
      setOutlets(data.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOutlets(); }, []);

  const openModal = (outlet?: Outlet) => {
    if (outlet) {
      setEditId(outlet.id);
      setName(outlet.name);
      setIsActive(outlet.is_active);
    } else {
      setEditId(null);
      setName('');
      setIsActive(true);
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Nama outlet wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const method = editId ? 'PATCH' : 'POST';
      const body = { id: editId, name, is_active: isActive };
      
      const res = await fetch('/api/admin/outlets', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Terjadi kesalahan.');
      }
      
      toast.success(editId ? 'Outlet diperbarui.' : 'Outlet ditambahkan.');
      setModalOpen(false);
      fetchOutlets();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan outlet.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Outlet</h1>
            <p className="text-sm text-gray-500 mt-0.5">Kelola daftar cabang outlet.</p>
          </div>
          <Button onClick={() => openModal()}><Plus className="h-4 w-4" /> Tambah Outlet</Button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-gray-500 font-semibold uppercase text-xs">Nama Outlet</th>
                    <th className="px-4 py-3 text-gray-500 font-semibold uppercase text-xs text-center">Status</th>
                    <th className="px-4 py-3 text-gray-500 font-semibold uppercase text-xs text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {outlets.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-500">Data tidak ditemukan.</td></tr>
                  ) : (
                    outlets.map(outlet => (
                      <tr key={outlet.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" /> {outlet.name}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${outlet.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {outlet.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openModal(outlet)} className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
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

      <Modal open={modalOpen} onClose={() => !saving && setModalOpen(false)} title={editId ? 'Edit Outlet' : 'Tambah Outlet'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nama Outlet" required value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: 01. TAPLAU" />
          
          {editId && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-gray-50 rounded-xl">
              <input type="checkbox" id="active" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
              <label htmlFor="active" className="text-sm font-medium text-gray-700">Outlet Aktif</label>
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
