'use client';

import { useState, useCallback } from 'react';
import { Upload, X, Camera, Loader2, ImageIcon } from 'lucide-react';
import { compressConditionPhoto, compressReceipt, validateImageFile } from '@/lib/utils/image-compress';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

interface PhotoUploaderProps {
  requestId: string;
  requestCode: string;
  editToken: string;
  type: 'photo' | 'receipt';
  existingCount?: number;
  onUploadSuccess?: (storagePath: string) => void;
  supabaseUrl: string;
}

export default function PhotoUploader({
  requestId,
  requestCode,
  editToken,
  type,
  existingCount = 0,
  onUploadSuccess,
  supabaseUrl,
}: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const maxPhotos = 3;
  const remaining = maxPhotos - existingCount - previews.length;

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (remaining <= 0) {
      toast.error(`Maksimal ${maxPhotos} ${type === 'photo' ? 'foto kondisi' : 'nota'}.`);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remaining);

    for (const file of filesToProcess) {
      const validationError = validateImageFile(file);
      if (validationError) {
        toast.error(validationError);
        continue;
      }

      setUploading(true);
      try {
        // Compress
        const compressed = type === 'photo'
          ? await compressConditionPhoto(file)
          : await compressReceipt(file);

        // Get signed URL
        const bucket = type === 'photo' ? 'request-condition-photos' : 'request-receipts';
        const fileExt = 'webp';
        const fileIndex = existingCount + previews.length + 1;
        const fileName = type === 'photo' ? `photo-${fileIndex}.${fileExt}` : `receipt-${fileIndex}.${fileExt}`;
        const storagePath = `${requestCode}/${fileName}`;

        const signedRes = await fetch('/api/upload/signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bucket, path: storagePath, token: editToken }),
        });

        if (!signedRes.ok) {
          throw new Error('Gagal mendapatkan URL upload.');
        }

        const { signedUrl } = await signedRes.json();

        // Upload to Supabase Storage
        const uploadRes = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'image/webp' },
          body: compressed,
        });

        if (!uploadRes.ok) {
          throw new Error('Upload gagal.');
        }

        // Save record to DB
        const saveRes = await fetch(`/api/requests/${requestId}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storage_path: storagePath, edit_token: editToken, type }),
        });

        if (!saveRes.ok) {
          const err = await saveRes.json();
          throw new Error(err.error || 'Gagal menyimpan foto.');
        }

        // Preview
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setPreviews((p) => [...p, e.target!.result as string]);
          }
        };
        reader.readAsDataURL(compressed);

        onUploadSuccess?.(storagePath);
        toast.success(type === 'photo' ? 'Foto berhasil diunggah.' : 'Nota berhasil diunggah.');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Foto gagal diunggah. Silakan coba foto lain.';
        toast.error(msg);
      } finally {
        setUploading(false);
      }
    }
  }, [requestId, requestCode, editToken, type, existingCount, previews.length, remaining, onUploadSuccess]);

  return (
    <div className="space-y-3">
      {previews.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {previews.map((src, i) => (
            <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <label className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer',
          'transition-colors hover:border-primary-400 hover:bg-primary-50',
          uploading ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' : 'border-gray-200'
        )}>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple={remaining > 1}
            className="hidden"
            disabled={uploading}
            onChange={(e) => handleFiles(e.target.files)}
          />
          {uploading ? (
            <Loader2 className="h-5 w-5 text-primary-500 animate-spin flex-shrink-0" />
          ) : (
            <Camera className="h-5 w-5 text-primary-600 flex-shrink-0" />
          )}
          <div>
            <p className="text-sm font-medium text-gray-700">
              {uploading ? 'Mengunggah...' : type === 'photo' ? 'Tambah Foto Kondisi' : 'Upload Nota'}
            </p>
            <p className="text-xs text-gray-400">
              {remaining} slot tersisa · JPG, PNG, WebP · Maks ~2MB
            </p>
          </div>
        </label>
      )}

      {remaining <= 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200">
          <ImageIcon className="h-4 w-4 text-green-600" />
          <p className="text-sm text-green-700 font-medium">
            Batas maksimal {maxPhotos} {type === 'photo' ? 'foto' : 'nota'} tercapai.
          </p>
        </div>
      )}
    </div>
  );
}
