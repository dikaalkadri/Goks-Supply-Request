'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminPage from '@/components/admin/AdminPage';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { LoadingState } from '@/components/ui/States';
import type { Outlet } from '@/types';
import toast from 'react-hot-toast';

// One draggable table row. Press-and-hold (or keyboard: Space + arrows) to move.
function SortableOutletRow({
  outlet,
  index,
  disabled,
  onEdit,
  onDelete,
}: {
  outlet: Outlet;
  index: number;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: outlet.id,
    disabled,
  });

  return (
    <tr
      ref={setNodeRef}
      // Vertical movement only
      style={{ transform: CSS.Translate.toString(transform && { ...transform, x: 0 }), transition }}
      className={`border-b border-gray-50 select-none ${
        isDragging ? 'relative z-10 bg-primary-50 shadow-lg' : 'hover:bg-gray-50/50'
      } ${disabled ? '' : 'cursor-grab active:cursor-grabbing'}`}
      {...attributes}
      {...listeners}
      aria-label={`${outlet.name}, posisi ${index + 1}. Tekan dan tahan untuk memindahkan.`}
    >
      <td className="pl-3 pr-0 py-3 text-gray-300 w-6">
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </td>
      <td className="pl-2 pr-2 py-3 text-right text-gray-400 tabular-nums">{index + 1}</td>
      <td className="px-4 py-3 font-medium text-gray-900">
        <span className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-400" /> {outlet.name}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${outlet.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {outlet.is_active ? 'Aktif' : 'Nonaktif'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {/* Keep Enter/Space on these buttons from starting a keyboard drag of the row */}
        <div className="flex items-center justify-end gap-1" onKeyDown={(e) => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Hapus"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminOutletsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit/add modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState<Outlet | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Drag & drop reorder
  const [savingOrder, setSavingOrder] = useState(false);
  const sensors = useSensors(
    // Hold ~200ms before dragging so taps, button clicks and page scroll still work
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const previous = outlets;
    const next = arrayMove(
      outlets,
      outlets.findIndex((o) => o.id === active.id),
      outlets.findIndex((o) => o.id === over.id)
    );
    setOutlets(next); // optimistic
    setSavingOrder(true);
    try {
      const res = await fetch('/api/admin/outlets/order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: next.map((o) => o.id) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan urutan.');
      toast.success('Urutan outlet disimpan.');
    } catch (err: unknown) {
      setOutlets(previous);
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan urutan.');
    } finally {
      setSavingOrder(false);
    }
  };

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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan outlet.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/outlets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Outlet berhasil dihapus.');
      setDeleteTarget(null);
      fetchOutlets();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus outlet.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <AdminPage
        title="Outlet"
        subtitle="Kelola daftar outlet. Tekan dan tahan baris, lalu geser untuk mengubah urutan."
        actions={<Button onClick={() => openModal()}><Plus className="h-4 w-4" /> Tambah Outlet</Button>}
      >

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingState />
          ) : (
            <div className="overflow-x-auto">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={outlets.map((o) => o.id)} strategy={verticalListSortingStrategy}>
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="w-6" aria-label="Geser" />
                    <th className="pl-2 pr-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right w-12">No</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nama Outlet</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {outlets.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">Data tidak ditemukan.</td></tr>
                  ) : (
                    outlets.map((outlet, i) => (
                      <SortableOutletRow
                        key={outlet.id}
                        outlet={outlet}
                        index={i}
                        disabled={savingOrder}
                        onEdit={() => openModal(outlet)}
                        onDelete={() => setDeleteTarget(outlet)}
                      />
                    ))
                  )}
                </tbody>
              </table>
              </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </AdminPage>

      {/* Edit / Add Modal */}
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

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} title="Hapus Outlet">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Yakin ingin menghapus outlet <span className="font-semibold text-gray-900">&ldquo;{deleteTarget?.name}&rdquo;</span>?
            <br />
            <span className="text-red-500 text-xs mt-1 block">Tindakan ini tidak dapat dibatalkan.</span>
          </p>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => setDeleteTarget(null)} disabled={deleting}>Batal</Button>
            <Button type="button" variant="danger" fullWidth loading={deleting} onClick={handleDelete}>
              <Trash2 className="h-4 w-4" /> Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
